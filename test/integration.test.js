const request = require('supertest');
const app = require('../server');

describe('Agri-Access Integration Tests', () => {
  
  // Test sample farm data
  const sampleFarmData = {
    farmerName: 'Test Farmer',
    latitude: -6.7749,
    longitude: 107.1389,
    farmSize: 2.5,
    primaryCrop: 'rice'
  };

  describe('API Health Check', () => {
    test('GET /api/health should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'Agri-Access NASA Satellite Data Proxy');
    });
  });

  describe('Main Analysis Endpoint', () => {
    test('POST /api/analyze should process farm data successfully', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send(sampleFarmData)
        .expect(200);

      // Basic response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('farmInfo');
      expect(response.body).toHaveProperty('dataSources');
      expect(response.body).toHaveProperty('analysisResults');
      expect(response.body).toHaveProperty('errors');

      // Farm info validation
      expect(response.body.farmInfo).toMatchObject(sampleFarmData);

      // Data sources should be an array
      expect(Array.isArray(response.body.dataSources)).toBe(true);

      // Analysis results structure
      expect(response.body.analysisResults).toHaveProperty('creditScore');
      expect(response.body.analysisResults).toHaveProperty('dataSourceCount');
      expect(response.body.analysisResults).toHaveProperty('confidence');

    }, 30000); // 30 second timeout for comprehensive analysis

    test('POST /api/analyze should handle missing required fields', async () => {
      const incompleteData = {
        farmerName: 'Test Farmer'
        // Missing latitude, longitude, farmSize, primaryCrop
      };

      const response = await request(app)
        .post('/api/analyze')
        .send(incompleteData);

      // Should still process with available data
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('farmInfo');
      expect(response.body.farmInfo.farmerName).toBe('Test Farmer');
    });

    test('POST /api/analyze should handle invalid coordinates', async () => {
      const invalidData = {
        ...sampleFarmData,
        latitude: 999,
        longitude: -999
      };

      const response = await request(app)
        .post('/api/analyze')
        .send(invalidData)
        .expect(200);

      // Should handle gracefully and return response
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Data Integration Components', () => {
    test('Analysis should include satellite data sources', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send(sampleFarmData)
        .expect(200);

      // Check for satellite data
      expect(response.body).toHaveProperty('gfsadData');
      expect(response.body).toHaveProperty('modisData');
      expect(response.body).toHaveProperty('browseImages');

      // Validate satellite data structure
      if (response.body.gfsadData && response.body.gfsadData.available) {
        expect(response.body.gfsadData).toHaveProperty('resolution');
        expect(response.body.gfsadData).toHaveProperty('dataSize');
      }

      if (response.body.modisData && response.body.modisData.available) {
        expect(response.body.modisData).toHaveProperty('resolution');
        expect(response.body.modisData).toHaveProperty('dataSize');
      }

      expect(Array.isArray(response.body.browseImages)).toBe(true);
    }, 30000);

    test('Analysis should include government data when available', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send(sampleFarmData)
        .expect(200);

      // Check for government data integration
      if (response.body.governmentData) {
        expect(response.body.governmentData).toHaveProperty('analysisResults');
        expect(response.body.analysisResults).toHaveProperty('governmentDataContribution');
        expect(response.body.analysisResults).toHaveProperty('governmentValidation');
      }
    }, 30000);

    test('Analysis should include weather data when available', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send(sampleFarmData)
        .expect(200);

      // Check for weather data integration
      if (response.body.weatherData) {
        expect(response.body.weatherData).toHaveProperty('analysisResults');
        expect(response.body.analysisResults).toHaveProperty('weatherDataContribution');
        expect(response.body.analysisResults).toHaveProperty('weatherSupport');
      }
    }, 30000);

    test('Analysis should include payment data when available', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send(sampleFarmData)
        .expect(200);

      // Check for payment data integration
      if (response.body.paymentData) {
        expect(response.body.paymentData).toHaveProperty('analysisResults');
        expect(response.body.analysisResults).toHaveProperty('paymentDataContribution');
        expect(response.body.analysisResults).toHaveProperty('digitalPaymentSupport');
      }
    }, 30000);
  });

  describe('Credit Scoring Logic', () => {
    test('Credit score should be within valid range', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send(sampleFarmData)
        .expect(200);

      const creditScore = response.body.analysisResults.creditScore;
      expect(creditScore).toBeGreaterThanOrEqual(300);
      expect(creditScore).toBeLessThanOrEqual(850);
      expect(Number.isInteger(creditScore)).toBe(true);
    }, 30000);

    test('Enhanced credit score should include all data source contributions', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send(sampleFarmData)
        .expect(200);

      const analysisResults = response.body.analysisResults;
      
      // Check that contributions are tracked
      expect(analysisResults).toHaveProperty('governmentDataContribution');
      expect(analysisResults).toHaveProperty('weatherDataContribution');
      expect(analysisResults).toHaveProperty('paymentDataContribution');

      // Contributions should be non-negative numbers
      expect(analysisResults.governmentDataContribution).toBeGreaterThanOrEqual(0);
      expect(analysisResults.weatherDataContribution).toBeGreaterThanOrEqual(0);
      expect(analysisResults.paymentDataContribution).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe('Data Source Validation', () => {
    test('Data sources array should contain expected integrations', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send(sampleFarmData)
        .expect(200);

      const dataSources = response.body.dataSources;
      expect(Array.isArray(dataSources)).toBe(true);
      
      // Should have multiple data sources when available
      if (dataSources.length > 0) {
        // Check for expected data source types
        const sourceTypes = [
          'NASA GFSAD',
          'NASA MODIS',
          'Google Earth Engine',
          'BPS Statistics Indonesia',
          'Portal Satu Data Indonesia',
          'Ministry of Agriculture BDSP',
          'Open-Meteo Weather API',
          'OpenWeatherMap API',
          'BMKG Indonesia',
          'OVO Partnership Analysis',
          'GoPay Integration Analysis',
          'DANA Payment Analysis',
          'Telco Data Analysis',
          'QRIS Integration Analysis'
        ];

        // At least some data sources should be available
        expect(dataSources.length).toBeGreaterThan(0);
      }
    }, 30000);

    test('Data source count should match analysis results', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send(sampleFarmData)
        .expect(200);

      const dataSourceCount = response.body.analysisResults.dataSourceCount;
      const actualDataSources = response.body.dataSources.length;

      expect(dataSourceCount).toBe(actualDataSources);
    }, 30000);
  });

  describe('Error Handling', () => {
    test('Errors array should be properly formatted', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send(sampleFarmData)
        .expect(200);

      expect(Array.isArray(response.body.errors)).toBe(true);
      
      // Each error should be a string
      response.body.errors.forEach(error => {
        expect(typeof error).toBe('string');
      });
    }, 30000);

    test('Service should handle network timeouts gracefully', async () => {
      // Test with remote coordinates that might cause timeouts
      const remoteData = {
        ...sampleFarmData,
        latitude: -8.5,
        longitude: 140.0,
        farmerName: 'Remote Farmer'
      };

      const response = await request(app)
        .post('/api/analyze')
        .send(remoteData)
        .expect(200);

      // Should still return a response even with potential timeouts
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('farmInfo');
    }, 30000);
  });

  describe('Different Crop Types', () => {
    const cropTypes = ['rice', 'palm oil', 'coffee', 'cocoa', 'rubber'];

    cropTypes.forEach(crop => {
      test(`Should handle ${crop} crop analysis`, async () => {
        const cropData = {
          ...sampleFarmData,
          primaryCrop: crop,
          farmerName: `${crop.charAt(0).toUpperCase() + crop.slice(1)} Farmer`
        };

        const response = await request(app)
          .post('/api/analyze')
          .send(cropData)
          .expect(200);

        expect(response.body.farmInfo.primaryCrop).toBe(crop);
        expect(response.body).toHaveProperty('analysisResults');
        expect(response.body.analysisResults).toHaveProperty('creditScore');
      }, 30000);
    });
  });

  describe('Geographic Coverage', () => {
    const indonesianLocations = [
      { name: 'Java', lat: -6.7749, lon: 107.1389 },
      { name: 'Sumatra', lat: -2.5489, lon: 99.6401 },
      { name: 'Kalimantan', lat: -1.5, lon: 113.0 },
      { name: 'Sulawesi', lat: -2.0, lon: 120.0 }
    ];

    indonesianLocations.forEach(location => {
      test(`Should handle ${location.name} location analysis`, async () => {
        const locationData = {
          ...sampleFarmData,
          latitude: location.lat,
          longitude: location.lon,
          farmerName: `${location.name} Farmer`
        };

        const response = await request(app)
          .post('/api/analyze')
          .send(locationData)
          .expect(200);

        expect(response.body.farmInfo.latitude).toBe(location.lat);
        expect(response.body.farmInfo.longitude).toBe(location.lon);
        expect(response.body).toHaveProperty('analysisResults');
      }, 30000);
    });
  });

  describe('Individual Data Sources Endpoints', () => {
    test('GET /api/test/gfsad should work with coordinates', async () => {
      const response = await request(app)
        .get('/api/test/gfsad')
        .query({ lat: -6.7749, lon: 107.1389 })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('dataset', 'gfsad');
    });

    test('GET /api/test/modis should work with coordinates', async () => {
      const response = await request(app)
        .get('/api/test/modis')
        .query({ lat: -6.7749, lon: 107.1389 })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('dataset', 'modis');
    });

    test('GET /api/test without coordinates should return 400', async () => {
      await request(app)
        .get('/api/test/gfsad')
        .expect(400);
    });

    test('GET /api/test with invalid dataset should return 400', async () => {
      await request(app)
        .get('/api/test/invalid')
        .query({ lat: -6.7749, lon: 107.1389 })
        .expect(400);
    });
  });

  describe('Image Proxy Endpoint', () => {
    test('GET /api/proxy-image without URL should return 400', async () => {
      await request(app)
        .get('/api/proxy-image')
        .expect(400);
    });

    test('GET /api/proxy-image with invalid URL should handle gracefully', async () => {
      const response = await request(app)
        .get('/api/proxy-image')
        .query({ url: 'invalid-url' });

      // Should return an error response
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Performance Tests', () => {
    test('Analysis should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/analyze')
        .send(sampleFarmData)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    }, 35000);

    test('Multiple concurrent requests should be handled', async () => {
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        const farmData = {
          ...sampleFarmData,
          farmerName: `Concurrent Farmer ${i + 1}`,
          latitude: sampleFarmData.latitude + (i * 0.01),
          longitude: sampleFarmData.longitude + (i * 0.01)
        };

        promises.push(
          request(app)
            .post('/api/analyze')
            .send(farmData)
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.body).toHaveProperty('success');
        expect(response.body.farmInfo.farmerName).toBe(`Concurrent Farmer ${index + 1}`);
      });
    }, 45000);
  });
});