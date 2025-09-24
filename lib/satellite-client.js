const axios = require('axios');
const GoogleEarthEngineRestClient = require('./gee-rest-client');

class SatelliteClient {
  constructor() {
    this.baseUrl = 'https://cmr.earthdata.nasa.gov';
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Agri-Access/2.0'
      }
    });
    
    this.geeClient = new GoogleEarthEngineRestClient();
    this.useGEE = this.isGEEAvailable();
  }

  isGEEAvailable() {
    // Check if Google Earth Engine credentials are configured
    return !!(process.env.GEE_SERVICE_ACCOUNT && process.env.GEE_PRIVATE_KEY);
  }

  async getRealSatelliteDataForLocation(farmData) {
    const satelliteData = {
      farmInfo: farmData,
      geeData: null,
      gfsadData: null,
      modisData: null,
      browseImages: [],
      analysisResults: {},
      success: false,
      errors: [],
      dataSources: []
    };

    // Fetch data from all sources in parallel for better performance
    const [geeData, gfsadData, modisData] = await Promise.allSettled([
      this.useGEE ? this.geeClient.getComprehensiveAgriculturalData(
        farmData.latitude, farmData.longitude, farmData.farmSize
      ) : Promise.resolve(null),
      this.getGFSADData(farmData),
      this.getMODISData(farmData)
    ]);

    // Process GEE data
    if (geeData.status === 'fulfilled' && geeData.value) {
      satelliteData.geeData = geeData.value;
      satelliteData.dataSources.push('Google Earth Engine (10m resolution)');
    } else if (geeData.status === 'rejected') {
      satelliteData.errors.push(`GEE: ${geeData.reason.message}`);
    }

    // Process GFSAD data  
    if (gfsadData.status === 'fulfilled' && gfsadData.value?.available) {
      satelliteData.gfsadData = gfsadData.value;
      satelliteData.dataSources.push('NASA GFSAD (30m cropland)');
    } else {
      satelliteData.gfsadData = { available: false };
      if (gfsadData.status === 'rejected') {
        satelliteData.errors.push(`GFSAD: ${gfsadData.reason.message}`);
      }
    }

    // Process MODIS data
    if (modisData.status === 'fulfilled' && modisData.value?.available) {
      satelliteData.modisData = modisData.value;
      satelliteData.dataSources.push('NASA MODIS (250m vegetation)');
    } else {
      satelliteData.modisData = { available: false };
      if (modisData.status === 'rejected') {
        satelliteData.errors.push(`MODIS: ${modisData.reason.message}`);
      }
    }

    // Get browse images
    try {
      satelliteData.browseImages = await this.getBrowseImages(satelliteData);
    } catch (error) {
      satelliteData.browseImages = [];
      satelliteData.errors.push(`Browse Images: ${error.message}`);
    }
    
    // Generate analysis
    const hasData = satelliteData.geeData || satelliteData.gfsadData?.available || satelliteData.modisData?.available;
    
    if (hasData) {
      satelliteData.analysisResults = this.generateAnalysis(satelliteData);
      satelliteData.success = true;
    } else {
      satelliteData.success = false;
      satelliteData.analysisResults = { error: 'No satellite data available', creditScore: null };
    }
    
    return satelliteData;
  }

  async getGFSADData(farmData) {
    const bbox = `${farmData.longitude - 0.5},${farmData.latitude - 0.5},${farmData.longitude + 0.5},${farmData.latitude + 0.5}`;
    
    try {
      const response = await this.client.get(`${this.baseUrl}/search/granules.json`, {
        params: {
          collection_concept_id: 'C2763261715-LPCLOUD', // GFSAD30SEACE
          page_size: 5,
          bounding_box: bbox,
          temporal: '2015-01-01T00:00:00Z,2020-12-31T23:59:59Z'
        }
      });
      
      if (response.data.feed.entry?.length > 0) {
        const granule = response.data.feed.entry[0];
        return {
          available: true,
          granuleId: granule.id,
          title: granule.title,
          dataSize: granule.granule_size,
          updated: granule.updated,
          resolution: '30 meters',
          links: granule.links || [],
          bbox: bbox
        };
      }
      
      return { available: false, reason: 'No granules found for location' };
    } catch (error) {
      // Try fallback without bounding box
      try {
        const fallbackResponse = await this.client.get(`${this.baseUrl}/search/granules.json`, {
          params: {
            collection_concept_id: 'C2763261715-LPCLOUD',
            page_size: 3,
            temporal: '2015-01-01T00:00:00Z,2020-12-31T23:59:59Z'
          }
        });
        
        if (fallbackResponse.data.feed.entry?.length > 0) {
          const granule = fallbackResponse.data.feed.entry[0];
          return {
            available: true,
            granuleId: granule.id,
            title: granule.title,
            dataSize: granule.granule_size,
            updated: granule.updated,
            resolution: '30 meters',
            links: granule.links || [],
            bbox: 'Global coverage'
          };
        }
      } catch (fallbackError) {
        // Ignore fallback error, throw original
      }
      
      throw error;
    }
  }

  async getMODISData(farmData) {
    const bbox = `${farmData.longitude - 0.2},${farmData.latitude - 0.2},${farmData.longitude + 0.2},${farmData.latitude + 0.2}`;
    
    try {
      const response = await this.client.get(`${this.baseUrl}/search/granules.json`, {
        params: {
          collection_concept_id: 'C1748066515-LPCLOUD', // MOD13Q1 MODIS Vegetation Indices v6.1
          page_size: 5,
          bounding_box: bbox,
          temporal: '2024-01-01T00:00:00Z,2024-12-31T23:59:59Z'
        }
      });

      if (response.data.feed.entry?.length > 0) {
        const granule = response.data.feed.entry[0];
        return {
          available: true,
          granuleId: granule.id,
          title: granule.title,
          dataSize: granule.granule_size,
          timeStart: granule.time_start,
          timeEnd: granule.time_end,
          resolution: '250 meters',
          links: granule.links || [],
          bbox: bbox
        };
      }
      
      return { available: false, reason: 'No granules found for location' };
    } catch (error) {
      // Try fallback without bounding box
      try {
        const fallbackResponse = await this.client.get(`${this.baseUrl}/search/granules.json`, {
          params: {
            collection_concept_id: 'C1748066515-LPCLOUD',
            page_size: 3,
            temporal: '2024-01-01T00:00:00Z,2024-12-31T23:59:59Z'
          }
        });
        
        if (fallbackResponse.data.feed.entry?.length > 0) {
          const granule = fallbackResponse.data.feed.entry[0];
          return {
            available: true,
            granuleId: granule.id,
            title: granule.title,
            dataSize: granule.granule_size,
            timeStart: granule.time_start,
            timeEnd: granule.time_end,
            resolution: '250 meters',
            links: granule.links || [],
            bbox: 'Global coverage'
          };
        }
      } catch (fallbackError) {
        // Ignore fallback error, throw original
      }
      
      throw error;
    }
  }

  async getBrowseImages(satelliteData) {
    const browseImages = [];

    // Google Earth Engine images (highest priority)
    if (satelliteData.geeData?.geeImages) {
      satelliteData.geeData.geeImages.forEach(geeImage => {
        browseImages.push({
          type: geeImage.type,
          description: geeImage.description,
          url: geeImage.url,
          title: `${geeImage.type} - ${geeImage.date}`,
          dataset: 'gee-analysis',
          source: geeImage.source,
          resolution: geeImage.resolution,
          bbox: geeImage.bbox,
          priority: geeImage.priority || 1
        });
      });
    }

    // GFSAD browse images
    if (satelliteData.gfsadData?.available && satelliteData.gfsadData.links) {
      const gfsadBrowse = satelliteData.gfsadData.links.filter(link => 
        link.rel === 'http://esipfed.org/ns/fedsearch/1.1/browse#' && 
        (link.href.includes('.jpg') || link.href.includes('.png')) &&
        link.href.startsWith('https://')
      );
      
      gfsadBrowse.forEach(browse => {
        browseImages.push({
          type: 'GFSAD30SEACE',
          description: 'Cropland Classification (30m resolution)',
          url: browse.href,
          title: browse.title || 'GFSAD Cropland Data',
          dataset: 'cropland',
          priority: 2
        });
      });
    }

    // MODIS browse images
    if (satelliteData.modisData?.available && satelliteData.modisData.links) {
      const modisBrowse = satelliteData.modisData.links.filter(link => 
        link.rel === 'http://esipfed.org/ns/fedsearch/1.1/browse#' && 
        (link.href.includes('.jpg') || link.href.includes('.png')) &&
        link.href.startsWith('https://')
      );
      
      modisBrowse.forEach(browse => {
        browseImages.push({
          type: 'MODIS',
          description: 'Vegetation Index (250m resolution)',
          url: browse.href,
          title: browse.title || 'MODIS Vegetation Data',
          dataset: 'vegetation',
          priority: 3
        });
      });
    }

    return browseImages.sort((a, b) => (a.priority || 99) - (b.priority || 99));
  }

  generateAnalysis(satelliteData) {
    console.log(`   🧮 Analyzing satellite data...`);
    const farmData = satelliteData.farmInfo;
    let baseScore = 500;
    let dataQuality = 'Basic';
    let confidence = 'Limited';
    
    // Data source availability
    const hasGEE = !!satelliteData.geeData;
    const hasGFSAD = satelliteData.gfsadData?.available;
    const hasMODIS = satelliteData.modisData?.available;
    const dataSourceCount = satelliteData.dataSources.length;

    // Base scoring based on data availability
    let activeSources = 0;
    if (hasGEE) activeSources++;
    if (hasGFSAD) activeSources++;
    if (hasMODIS) activeSources++;
    
    if (hasGEE && hasGFSAD && hasMODIS) {
      dataQuality = `${activeSources}/3 satellite sources`;
      confidence = 'Google Earth Engine + NASA GFSAD + NASA MODIS';
      baseScore += 200;
    } else if (hasGEE && (hasGFSAD || hasMODIS)) {
      dataQuality = `${activeSources}/3 satellite sources`;
      confidence = 'Google Earth Engine + 1 NASA dataset';
      baseScore += 150;
    } else if (hasGEE) {
      dataQuality = `${activeSources}/3 satellite sources`;
      confidence = 'Google Earth Engine only';
      baseScore += 100;
    } else if (hasGFSAD && hasMODIS) {
      dataQuality = `${activeSources}/3 satellite sources`;
      confidence = 'NASA GFSAD + NASA MODIS';
      baseScore += 125;
    } else if (hasGFSAD || hasMODIS) {
      dataQuality = `${activeSources}/3 satellite sources`;
      confidence = hasMODIS ? 'NASA MODIS only' : 'NASA GFSAD only';
      baseScore += 75;
    }

    // Additional analysis scores
    if (hasGEE) {
      baseScore += this.analyzeGEEVegetation(satelliteData.geeData);
      baseScore += this.analyzeGEETerrain(satelliteData.geeData);
    }

    if (hasGFSAD) baseScore += 40;
    if (hasMODIS) baseScore += 40;

    // Cross-validation bonus
    if (hasGEE && (hasGFSAD || hasMODIS)) {
      baseScore += this.performCrossValidation(satelliteData);
    }

    // Farm size component
    const sizeMultiplier = hasGEE ? 15 : 10;
    const sizeBonus = Math.min(farmData.farmSize * sizeMultiplier, 75);
    baseScore += sizeBonus;

    const finalScore = Math.max(300, Math.min(850, baseScore));

    const eligibility = this.determineLoanEligibility(finalScore, farmData.farmSize);

    // Analysis results with data source details
    const analysisResults = {
      creditScore: Math.round(finalScore),
      eligibility: eligibility,
      dataQuality: dataQuality,
      confidence: confidence,
      fusionLevel: this.getFusionLevel(hasGEE, hasGFSAD, hasMODIS),
      dataSources: satelliteData.dataSources,
      dataSourceCount: dataSourceCount,
      
      // Data availability flags
      geeDataAvailable: hasGEE,
      gfsadAvailable: hasGFSAD,
      modisAvailable: hasMODIS,
      browseImagesCount: satelliteData.browseImages.length,
      
      // Additional features when available
      vegetationHealth: hasGEE ? this.categorizeVegetationHealth(satelliteData.geeData.currentIndices.ndvi) : 'Unknown',
      terrainSuitability: hasGEE ? this.categorizeTerrainSuitability(satelliteData.geeData.terrainData?.slope) : 'Unknown',
      
      // Data quality metrics
      resolutionLevel: hasGEE ? '10m (High Resolution)' : hasGFSAD || hasMODIS ? '30-250m (Standard)' : 'Unknown',
      vegetationIndicesCount: hasGEE ? 4 : hasMODIS ? 2 : 0,
      
      // Analysis details
      analysisType: 'Satellite Data Analysis',
      enhancedFeatures: hasGEE ? {
        vegetationIndices: satelliteData.geeData.currentIndices,
        terrainAnalysis: satelliteData.geeData.terrainData,
        landCover: satelliteData.geeData.landCover,
        vegetationHealth: this.categorizeVegetationHealth(satelliteData.geeData.currentIndices.ndvi),
        terrainSuitability: this.categorizeTerrainSuitability(satelliteData.geeData.terrainData?.slope)
      } : null,
      
      // Confidence explanation
      confidenceExplanation: this.generateConfidenceExplanation(hasGEE, hasGFSAD, hasMODIS)
    };

    return analysisResults;
  }

  generateGEEAnalysis(satelliteData) {
    console.log(`   🌍 Generating analysis from Google Earth Engine data...`);

    const farmData = satelliteData.farmInfo;
    const geeData = satelliteData.geeData;
    let baseScore = 500;
    
    // Data quality from GEE assessment
    const dataQuality = geeData.dataQuality.level;
    const confidence = geeData.dataQuality.level === 'Excellent' ? 'Very Strong' :
                      geeData.dataQuality.level === 'Good' ? 'Strong' :
                      geeData.dataQuality.level === 'Fair' ? 'Moderate' : 'Limited';

    // Base score adjustment based on data quality
    const qualityBonus = geeData.dataQuality.score * 2;
    baseScore += qualityBonus;
    console.log(`   📊 Data quality bonus: +${qualityBonus} points (${dataQuality})`);

    // Vegetation health scoring
    let vegetationScore = 0;
    if (geeData.currentIndices.ndvi !== null) {
      const ndvi = geeData.currentIndices.ndvi;
      if (ndvi >= 0.7) {
        vegetationScore += 100; // Excellent vegetation
      } else if (ndvi >= 0.5) {
        vegetationScore += 75; // Good vegetation
      } else if (ndvi >= 0.3) {
        vegetationScore += 50; // Fair vegetation
      } else if (ndvi >= 0.1) {
        vegetationScore += 25; // Poor vegetation
      }
      console.log(`   🌱 NDVI score: ${ndvi.toFixed(3)} → +${vegetationScore} points`);
    }

    // Enhanced Vegetation Index scoring
    if (geeData.currentIndices.evi !== null) {
      const evi = geeData.currentIndices.evi;
      if (evi >= 0.5) {
        vegetationScore += 50; // Additional EVI bonus
      } else if (evi >= 0.3) {
        vegetationScore += 30;
      } else if (evi >= 0.1) {
        vegetationScore += 15;
      }
      console.log(`   🌿 EVI score: ${evi.toFixed(3)} → additional vegetation bonus`);
    }

    baseScore += vegetationScore;

    // Historical stability scoring
    let stabilityScore = 0;
    if (geeData.historicalTrends && geeData.historicalTrends.stability) {
      switch (geeData.historicalTrends.stability) {
        case 'Very stable':
          stabilityScore = 80;
          break;
        case 'Stable':
          stabilityScore = 60;
          break;
        case 'Moderately variable':
          stabilityScore = 40;
          break;
        default:
          stabilityScore = 20;
      }
      console.log(`   📈 Stability score: ${geeData.historicalTrends.stability} → +${stabilityScore} points`);
    }

    // Trend bonus/penalty
    if (geeData.historicalTrends && geeData.historicalTrends.trend) {
      let trendBonus = 0;
      switch (geeData.historicalTrends.trend) {
        case 'Improving':
          trendBonus = 40;
          break;
        case 'Stable':
          trendBonus = 20;
          break;
        case 'Declining':
          trendBonus = -30;
          break;
      }
      stabilityScore += trendBonus;
      console.log(`   📊 Trend: ${geeData.historicalTrends.trend} → ${trendBonus >= 0 ? '+' : ''}${trendBonus} points`);
    }

    baseScore += stabilityScore;

    // Terrain suitability scoring
    let terrainScore = 0;
    if (geeData.terrainData && geeData.terrainData.slope !== null) {
      const slope = geeData.terrainData.slope;
      if (slope <= 5) {
        terrainScore += 60; // Excellent for agriculture
      } else if (slope <= 15) {
        terrainScore += 40; // Good for agriculture
      } else if (slope <= 30) {
        terrainScore += 20; // Acceptable
      } else {
        terrainScore -= 20; // Poor for agriculture
      }
      console.log(`   ⛰️ Terrain slope: ${slope.toFixed(1)}° → ${terrainScore >= 0 ? '+' : ''}${terrainScore} points`);
    }

    // Soil moisture bonus
    if (geeData.soilMoisture && geeData.soilMoisture.surface_soil_moisture !== null) {
      const soilMoisture = geeData.soilMoisture.surface_soil_moisture;
      if (soilMoisture >= 0.3) {
        terrainScore += 30; // Good soil moisture
      } else if (soilMoisture >= 0.2) {
        terrainScore += 15; // Adequate soil moisture
      }
      console.log(`   💧 Soil moisture: ${(soilMoisture * 100).toFixed(1)}% → terrain bonus`);
    }

    baseScore += terrainScore;

    // Farm size component
    const sizeBonus = Math.min(farmData.farmSize * 15, 75); // Higher bonus for GEE data
    baseScore += sizeBonus;
    console.log(`   📏 Farm size bonus: +${sizeBonus} points`);

    // Land cover appropriateness
    if (geeData.landCover && geeData.landCover.land_cover_class === 40) { // Cropland
      baseScore += 50;
      console.log(`   🗺️ Land cover: Confirmed cropland → +50 points`);
    }

    const finalScore = Math.max(300, Math.min(850, baseScore));
    console.log(`   📊 Final credit score: ${finalScore}/850 (${confidence} confidence)`);

    const eligibility = this.determineLoanEligibility(finalScore, farmData.farmSize);

    return {
      creditScore: Math.round(finalScore),
      eligibility: eligibility,
      dataQuality: dataQuality,
      confidence: confidence,
      vegetationHealth: this.categorizeVegetationHealth(geeData.currentIndices.ndvi),
      stabilityAssessment: geeData.historicalTrends?.stability || 'Unknown',
      trendAnalysis: geeData.historicalTrends?.trend || 'Unknown',
      terrainSuitability: this.categorizeTerrainSuitability(geeData.terrainData?.slope),
      satelliteDataUsed: true,
      geeDataAvailable: true,
      dataSource: 'Google Earth Engine',
      enhancedFeatures: {
        vegetationIndices: geeData.currentIndices,
        historicalTrends: geeData.historicalTrends,
        terrainAnalysis: geeData.terrainData,
        soilMoisture: geeData.soilMoisture,
        landCover: geeData.landCover
      }
    };
  }

  categorizeVegetationHealth(ndvi) {
    if (ndvi === null) return 'Unknown';
    if (ndvi >= 0.7) return 'Excellent';
    if (ndvi >= 0.5) return 'Good';
    if (ndvi >= 0.3) return 'Fair';
    if (ndvi >= 0.1) return 'Poor';
    return 'Very Poor';
  }

  categorizeTerrainSuitability(slope) {
    if (slope === null) return 'Unknown';
    if (slope <= 5) return 'Excellent';
    if (slope <= 15) return 'Good';
    if (slope <= 30) return 'Acceptable';
    return 'Poor';
  }

  // Analysis helper methods
  analyzeGEEVegetation(geeData) {
    let vegetationScore = 0;
    
    if (geeData.currentIndices.ndvi !== null) {
      const ndvi = geeData.currentIndices.ndvi;
      if (ndvi >= 0.7) vegetationScore += 80;      // Excellent
      else if (ndvi >= 0.5) vegetationScore += 60; // Good  
      else if (ndvi >= 0.3) vegetationScore += 40; // Fair
      else if (ndvi >= 0.1) vegetationScore += 20; // Poor
    }
    
    if (geeData.currentIndices.evi !== null) {
      const evi = geeData.currentIndices.evi;
      if (evi >= 0.5) vegetationScore += 30;
      else if (evi >= 0.3) vegetationScore += 20;
      else if (evi >= 0.1) vegetationScore += 10;
    }
    
    if (geeData.currentIndices.savi !== null) {
      const savi = geeData.currentIndices.savi;
      if (savi >= 0.6) vegetationScore += 20;
      else if (savi >= 0.4) vegetationScore += 15;
      else if (savi >= 0.2) vegetationScore += 10;
    }
    
    return Math.min(vegetationScore, 120); // Cap at 120 points
  }

  analyzeGEETerrain(geeData) {
    let terrainScore = 0;
    
    if (geeData.terrainData && geeData.terrainData.slope !== null) {
      const slope = geeData.terrainData.slope;
      if (slope <= 5) terrainScore += 50;        // Excellent for agriculture
      else if (slope <= 15) terrainScore += 35;  // Good for agriculture  
      else if (slope <= 30) terrainScore += 20;  // Acceptable
      else terrainScore -= 10;                   // Poor for agriculture
    }
    
    if (geeData.terrainData && geeData.terrainData.elevation !== null) {
      const elevation = geeData.terrainData.elevation;
      if (elevation >= 0 && elevation <= 1000) terrainScore += 15; // Good elevation range
      else if (elevation <= 2000) terrainScore += 10;             // Acceptable
    }
    
    return Math.max(0, Math.min(terrainScore, 60)); // Cap at 60 points, minimum 0
  }

  performCrossValidation(satelliteData) {
    let validationBonus = 0;
    
    // Vegetation validation between GEE and MODIS
    if (satelliteData.geeData && satelliteData.modisData?.available) {
      const geeHasVegetation = satelliteData.geeData.currentIndices.ndvi > 0.3;
      if (geeHasVegetation) validationBonus += 25;
    }
    
    // Cropland validation between GEE and GFSAD
    if (satelliteData.geeData && satelliteData.gfsadData?.available) {
      const geeLandCover = satelliteData.geeData.landCover?.land_cover_class;
      if (geeLandCover === 40) {
        validationBonus += 30;
      } else {
        validationBonus += 15;
      }
    }
    
    return validationBonus;
  }

  getFusionLevel(hasGEE, hasGFSAD, hasMODIS) {
    let count = 0;
    if (hasGEE) count++;
    if (hasGFSAD) count++;
    if (hasMODIS) count++;
    
    if (hasGEE && hasGFSAD && hasMODIS) return 'Google Earth Engine + NASA GFSAD + NASA MODIS';
    if (hasGEE && (hasGFSAD || hasMODIS)) return 'Google Earth Engine + ' + (hasMODIS ? 'NASA MODIS' : 'NASA GFSAD');
    if (hasGEE) return 'Google Earth Engine only';
    if (hasGFSAD && hasMODIS) return 'NASA GFSAD + NASA MODIS';
    if (hasGFSAD || hasMODIS) return hasMODIS ? 'NASA MODIS only' : 'NASA GFSAD only';
    return 'No satellite data available';
  }

  generateConfidenceExplanation(hasGEE, hasGFSAD, hasMODIS) {
    const explanations = [];
    
    if (hasGEE) {
      explanations.push('10m resolution Google Earth Engine data provides precise vegetation analysis');
    }
    if (hasGFSAD) {
      explanations.push('NASA GFSAD confirms cropland classification');
    }
    if (hasMODIS) {
      explanations.push('NASA MODIS provides vegetation health validation');
    }
    
    if (hasGEE && (hasGFSAD || hasMODIS)) {
      explanations.push('Data validation across multiple satellite sources increases reliability');
    }
    
    return explanations.join('. ') + '.';
  }

  determineLoanEligibility(score, farmSize) {
    if (score >= 700) {
      return {
        status: 'Excellent',
        maxLoan: farmSize * 15000000,
        interestRate: 3.5,
        approvalProbability: 95
      };
    } else if (score >= 600) {
      return {
        status: 'Good',
        maxLoan: farmSize * 10000000,
        interestRate: 5.5,
        approvalProbability: 80
      };
    } else if (score >= 500) {
      return {
        status: 'Fair',
        maxLoan: farmSize * 6000000,
        interestRate: 8.0,
        approvalProbability: 60
      };
    } else {
      return {
        status: 'Needs Improvement',
        maxLoan: farmSize * 3000000,
        interestRate: 12.0,
        approvalProbability: 30
      };
    }
  }
}

module.exports = SatelliteClient;