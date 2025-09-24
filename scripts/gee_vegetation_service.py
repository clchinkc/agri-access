#!/usr/bin/env python3
"""
Google Earth Engine Vegetation Indices Service

Real NDVI, EVI, SAVI, and NDMI calculations using GEE Python API.
Provides accurate vegetation analysis for agricultural credit scoring.
"""

import ee
import json
import sys
import os
from datetime import datetime, timedelta

class GEEVegetationService:
    """Service for calculating real vegetation indices using Google Earth Engine"""
    
    def __init__(self):
        self.initialized = False
        
    def initialize(self):
        """
        Initialize Google Earth Engine with multiple authentication fallbacks
        
        Returns:
            bool: True if initialization successful, False otherwise
        """
        try:
            if self.initialized:
                return True
                
            print("🌍 Initializing Google Earth Engine Python API...")
            
            # Authentication hierarchy: service account → user auth → public access
            try:
                if os.getenv('GEE_SERVICE_ACCOUNT') and os.getenv('GEE_PRIVATE_KEY'):
                    private_key = json.loads(os.getenv('GEE_PRIVATE_KEY'))
                    credentials = ee.ServiceAccountCredentials(
                        email=private_key['client_email'],
                        key_data=json.dumps(private_key)
                    )
                    ee.Initialize(credentials)
                    print("✅ Initialized with service account")
                else:
                    raise Exception("No service account credentials")
                    
            except Exception as service_error:
                print(f"   ⚠️ Service account failed: {service_error}")
                print("   🔄 Trying default authentication...")
                
                try:
                    # Try initialize without authentication first (public access)
                    ee.Initialize()
                    print("✅ Initialized with public access")
                except Exception as public_error:
                    print(f"   ⚠️ Public access failed: {public_error}")
                    print("   🔄 Trying default authentication...")
                    
                    try:
                        ee.Authenticate()
                        ee.Initialize()
                        print("✅ Initialized with default authentication") 
                    except Exception as auth_error:
                        print(f"   ⚠️ Authentication failed: {auth_error}")
                        # Use high timeout for initialization
                        ee.Initialize(opt_url='https://earthengine.googleapis.com')
                        print("✅ Initialized with fallback URL")
            
            self.initialized = True
            print("✅ Google Earth Engine Python API initialized successfully")
            return True
            
        except Exception as e:
            print(f"❌ Failed to initialize Google Earth Engine: {e}")
            return False
    
    def calculate_vegetation_indices(self, latitude, longitude, farm_size):
        """
        Calculate real vegetation indices using Google Earth Engine
        
        Args:
            latitude (float): Latitude coordinate
            longitude (float): Longitude coordinate  
            farm_size (float): Farm size in hectares
            
        Returns:
            dict: Real vegetation indices and metadata
        """
        try:
            if not self.initialized:
                if not self.initialize():
                    return self.get_fallback_data()
            
            print(f"🌱 Calculating real vegetation indices for {latitude}, {longitude}")
            
            # Create point geometry and buffer
            point = ee.Geometry.Point([longitude, latitude])
            buffer_size = max(250, farm_size * 50)  # Scale with farm size, minimum 250m
            roi = point.buffer(buffer_size)
            
            # Date range for recent data (last 30 days to avoid historical data issues)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            # Get Sentinel-2 surface reflectance collection
            s2_collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                           .filterBounds(roi)
                           .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                           .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                           .sort('CLOUDY_PIXEL_PERCENTAGE'))
            
            # Check if recent images are available with timeout handling
            try:
                collection_size = s2_collection.size().getInfo()
                if collection_size == 0:
                    print("   ⚠️ No recent Sentinel-2 images found, expanding search...")
                    start_date = end_date - timedelta(days=180)  # Expand to 6 months
                    s2_collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                                   .filterBounds(roi)
                                   .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50))
                                   .sort('CLOUDY_PIXEL_PERCENTAGE'))
                    
                    collection_size = s2_collection.size().getInfo()
                    if collection_size == 0:
                        print("   ❌ No Sentinel-2 images available for this location")
                        return self.get_fallback_data()
            except Exception as timeout_error:
                print(f"   ⚠️ Timeout checking collection size: {timeout_error}")
                print("   📊 Using fallback vegetation data")
                return self.get_fallback_data()
            
            # Get the best image with timeout handling
            try:
                print(f"   📡 Found {collection_size} Sentinel-2 images, processing best one...")
                best_image = s2_collection.first()
                
                # Calculate vegetation indices
                indices_image = self.add_vegetation_indices(best_image)
                
                # Get mean values over the region of interest
                stats = indices_image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=roi,
                    scale=10,  # 10m resolution
                    maxPixels=1e9
                )
                
                # Get the results with timeout handling
                try:
                    stats_dict = stats.getInfo()
                    image_info = best_image.getInfo()
                except Exception as stats_error:
                    print(f"   ⚠️ Error getting statistics: {stats_error}")
                    return self.get_fallback_data()
                
                # Extract image metadata
                image_date = datetime.fromtimestamp(image_info['properties']['system:time_start'] / 1000)
                cloud_percentage = image_info['properties']['CLOUDY_PIXEL_PERCENTAGE']
                
            except Exception as processing_error:
                print(f"   ⚠️ Error processing image: {processing_error}")
                print("   📊 Using fallback vegetation data due to processing error")
                return self.get_fallback_data()
            
            # Prepare results
            result = {
                'ndvi': round(stats_dict.get('NDVI', 0), 3),
                'evi': round(stats_dict.get('EVI', 0), 3),
                'savi': round(stats_dict.get('SAVI', 0), 3),
                'ndmi': round(stats_dict.get('NDMI', 0), 3),
                'dataSource': 'Google Earth Engine Python API',
                'resolution': '10m',
                'imageDate': image_date.strftime('%Y-%m-%d'),
                'cloudCoverage': round(cloud_percentage, 1),
                'satellite': 'Sentinel-2',
                'bufferSize': f"{buffer_size}m",
                'note': 'Real vegetation indices from Sentinel-2 surface reflectance'
            }
            
            print(f"   ✅ Real vegetation indices calculated:")
            print(f"   🌱 NDVI: {result['ndvi']} | EVI: {result['evi']} | SAVI: {result['savi']} | NDMI: {result['ndmi']}")
            print(f"   📅 Image date: {result['imageDate']} (Cloud: {result['cloudCoverage']}%)")
            
            return result
            
        except Exception as e:
            print(f"   ❌ Error calculating vegetation indices: {e}")
            print("   📊 Using fallback vegetation data due to general error")
            return self.get_fallback_data()
    
    def add_vegetation_indices(self, image):
        """
        Add vegetation indices to a Sentinel-2 image
        
        Args:
            image: Sentinel-2 Earth Engine image
            
        Returns:
            ee.Image: Image with added vegetation index bands
        """
        # Select spectral bands
        nir = image.select('B8')    # Near Infrared (842nm)
        red = image.select('B4')    # Red (665nm)
        blue = image.select('B2')   # Blue (490nm)
        swir = image.select('B11')  # SWIR (1610nm)
        
        # NDVI = (NIR - Red) / (NIR + Red)
        ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
        
        # EVI = 2.5 * ((NIR - Red) / (NIR + 6 * Red - 7.5 * Blue + 1))
        evi = image.expression(
            '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))',
            {'NIR': nir, 'RED': red, 'BLUE': blue}
        ).rename('EVI')
        
        # SAVI = ((NIR - Red) / (NIR + Red + 0.5)) * 1.5
        savi = nir.subtract(red).divide(nir.add(red).add(0.5)).multiply(1.5).rename('SAVI')
        
        # NDMI = (NIR - SWIR) / (NIR + SWIR)
        ndmi = nir.subtract(swir).divide(nir.add(swir)).rename('NDMI')
        
        return image.addBands([ndvi, evi, savi, ndmi])
    
    def get_fallback_data(self):
        """
        Return realistic fallback data when GEE is unavailable
        
        Returns:
            dict: Simulated vegetation indices based on tropical agriculture
        """
        import random
        
        # Generate realistic vegetation indices for tropical agriculture
        # NDVI: 0.4-0.9 for healthy crops, 0.6-0.8 typical for Indonesian rice/palm oil
        ndvi = round(0.6 + (random.random() * 0.25), 3)  # 0.6-0.85 range
        
        # EVI: Generally 1.5-4.0 for vegetation, correlates with NDVI
        evi = round(ndvi * 3.5 + random.random() * 0.5, 3)  # Realistic correlation
        
        # SAVI: Similar to NDVI but soil-adjusted, typically 0.5-0.8
        savi = round(ndvi * 0.9 + random.random() * 0.1, 3)
        
        # NDMI: Water content, typically 0.2-0.6 for healthy vegetation
        ndmi = round(0.25 + (random.random() * 0.25), 3)  # 0.25-0.5 range
        
        return {
            'ndvi': ndvi,
            'evi': evi,
            'savi': savi,
            'ndmi': ndmi,
            'dataSource': 'Simulated Vegetation Data',
            'resolution': '10m',
            'simulated': True,
            'note': 'Real GEE data unavailable, using realistic simulation based on Indonesian agricultural patterns'
        }

def main():
    """
    Command line interface for vegetation service
    
    Usage:
        python3 gee_vegetation_service.py <latitude> <longitude> <farm_size>
    """
    if len(sys.argv) != 4:
        print("Usage: python3 gee_vegetation_service.py <latitude> <longitude> <farm_size>")
        print("Example: python3 gee_vegetation_service.py -6.7749 107.1389 2.5")
        sys.exit(1)
    
    try:
        latitude = float(sys.argv[1])
        longitude = float(sys.argv[2])
        farm_size = float(sys.argv[3])
        
        service = GEEVegetationService()
        result = service.calculate_vegetation_indices(latitude, longitude, farm_size)
        
        # Output structured JSON for Node.js integration
        print("VEGETATION_RESULT_START")
        print(json.dumps(result, indent=2))
        print("VEGETATION_RESULT_END")
        
    except ValueError as e:
        print(f"Invalid parameter: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()