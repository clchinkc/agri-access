// Unit tests for individual components
const SatelliteClient = require('../lib/satellite-client');
const IndonesiaGovernmentClient = require('../lib/indonesia-government-client');
const WeatherClient = require('../lib/weather-client');
const PaymentClient = require('../lib/payment-client');

describe('Unit Tests for Data Integration Components', () => {
  
  const sampleFarmData = {
    farmerName: 'Test Farmer',
    latitude: -6.7749,
    longitude: 107.1389,
    farmSize: 2.5,
    primaryCrop: 'rice'
  };

  describe('SatelliteClient', () => {
    let satelliteClient;

    beforeEach(() => {
      satelliteClient = new SatelliteClient();
    });

    test('should initialize with correct configuration', () => {
      expect(satelliteClient).toBeInstanceOf(SatelliteClient);
      expect(satelliteClient.baseUrl).toBe('https://cmr.earthdata.nasa.gov');
      expect(satelliteClient.client).toBeDefined();
      expect(satelliteClient.geeClient).toBeDefined();
    });

    test('categorizeVegetationHealth should return correct categories', () => {
      expect(satelliteClient.categorizeVegetationHealth(null)).toBe('Unknown');
      expect(satelliteClient.categorizeVegetationHealth(0.8)).toBe('Excellent');
      expect(satelliteClient.categorizeVegetationHealth(0.6)).toBe('Good');
      expect(satelliteClient.categorizeVegetationHealth(0.4)).toBe('Fair');
      expect(satelliteClient.categorizeVegetationHealth(0.2)).toBe('Poor');
      expect(satelliteClient.categorizeVegetationHealth(0.05)).toBe('Very Poor');
    });

    test('categorizeTerrainSuitability should return correct categories', () => {
      expect(satelliteClient.categorizeTerrainSuitability(null)).toBe('Unknown');
      expect(satelliteClient.categorizeTerrainSuitability(3)).toBe('Excellent');
      expect(satelliteClient.categorizeTerrainSuitability(10)).toBe('Good');
      expect(satelliteClient.categorizeTerrainSuitability(25)).toBe('Acceptable');
      expect(satelliteClient.categorizeTerrainSuitability(35)).toBe('Poor');
    });

    test('determineLoanEligibility should return correct eligibility', () => {
      const result750 = satelliteClient.determineLoanEligibility(750, 2.0);
      expect(result750.status).toBe('Excellent');
      expect(result750.maxLoan).toBe(30000000);
      expect(result750.interestRate).toBe(3.5);
      expect(result750.approvalProbability).toBe(95);

      const result650 = satelliteClient.determineLoanEligibility(650, 2.0);
      expect(result650.status).toBe('Good');
      expect(result650.interestRate).toBe(5.5);

      const result550 = satelliteClient.determineLoanEligibility(550, 2.0);
      expect(result550.status).toBe('Fair');
      expect(result550.interestRate).toBe(8.0);

      const result450 = satelliteClient.determineLoanEligibility(450, 2.0);
      expect(result450.status).toBe('Needs Improvement');
      expect(result450.interestRate).toBe(12.0);
    });

    test('getFusionLevel should return correct fusion levels', () => {
      expect(satelliteClient.getFusionLevel(true, true, true)).toBe('Google Earth Engine + NASA GFSAD + NASA MODIS');
      expect(satelliteClient.getFusionLevel(true, true, false)).toBe('Google Earth Engine + NASA GFSAD');
      expect(satelliteClient.getFusionLevel(true, false, false)).toBe('Google Earth Engine only');
      expect(satelliteClient.getFusionLevel(false, true, true)).toBe('NASA GFSAD + NASA MODIS');
      expect(satelliteClient.getFusionLevel(false, true, false)).toBe('NASA GFSAD only');
      expect(satelliteClient.getFusionLevel(false, false, false)).toBe('No satellite data available');
    });

    test('analyzeGEEVegetation should calculate scores correctly', () => {
      const mockGeeData = {
        currentIndices: {
          ndvi: 0.8,
          evi: 0.6,
          savi: 0.7
        }
      };

      const score = satelliteClient.analyzeGEEVegetation(mockGeeData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(120);
    });

    test('analyzeGEETerrain should calculate scores correctly', () => {
      const mockGeeData = {
        terrainData: {
          slope: 3.5,
          elevation: 150
        }
      };

      const score = satelliteClient.analyzeGEETerrain(mockGeeData);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(60);
    });
  });

  describe('IndonesiaGovernmentClient', () => {
    let governmentClient;

    beforeEach(() => {
      governmentClient = new IndonesiaGovernmentClient();
    });

    test('should initialize with correct configuration', () => {
      expect(governmentClient).toBeInstanceOf(IndonesiaGovernmentClient);
      expect(governmentClient.bpsApiUrl).toBe('https://webapi.bps.go.id/v1');
      expect(governmentClient.satudataApiUrl).toBe('https://data.go.id/api/3');
      expect(governmentClient.bdspApiUrl).toBe('https://bdsp2.pertanian.go.id/api');
    });

    test('getLocationFromCoordinates should return correct regions', () => {
      // Jakarta coordinates
      const jakarta = governmentClient.getLocationFromCoordinates(-6.2, 106.8);
      expect(jakarta.name).toBe('DKI Jakarta');
      expect(jakarta.domain).toBe('3100');

      // West Java coordinates
      const westJava = governmentClient.getLocationFromCoordinates(-6.9, 107.6);
      expect(westJava.name).toBe('West Java');
      expect(westJava.domain).toBe('3200');

      // Unknown location
      const unknown = governmentClient.getLocationFromCoordinates(-10, 140);
      expect(unknown.name).toBe('Indonesia');
      expect(unknown.domain).toBe('0000');
    });

    test('getSubjectName should return correct subject names', () => {
      expect(governmentClient.getSubjectName('557')).toBe('Agriculture, Forestry, Fisheries');
      expect(governmentClient.getSubjectName('558')).toBe('Crop Production');
      expect(governmentClient.getSubjectName('559')).toBe('Livestock');
      expect(governmentClient.getSubjectName('560')).toBe('Agricultural Economics');
      expect(governmentClient.getSubjectName('999')).toBe('Subject 999');
    });

    test('getCropCategory should return correct categories', () => {
      expect(governmentClient.getCropCategory('rice')).toBe('Food Crops');
      expect(governmentClient.getCropCategory('palm oil')).toBe('Plantation Crops');
      expect(governmentClient.getCropCategory('coffee')).toBe('Plantation Crops');
      expect(governmentClient.getCropCategory('unknown')).toBe('General Agriculture');
    });

    test('getProductionRegions should return correct regions', () => {
      const riceRegions = governmentClient.getProductionRegions('rice');
      expect(riceRegions).toContain('Central Java');
      expect(riceRegions).toContain('East Java');

      const palmOilRegions = governmentClient.getProductionRegions('palm oil');
      expect(palmOilRegions).toContain('Riau');
      expect(palmOilRegions).toContain('North Sumatra');

      const unknownRegions = governmentClient.getProductionRegions('unknown');
      expect(unknownRegions).toEqual(['Various regions']);
    });

    test('getMarketPrices should return price information', () => {
      const ricePrice = governmentClient.getMarketPrices('rice');
      expect(ricePrice).toHaveProperty('current');
      expect(ricePrice).toHaveProperty('unit');
      expect(ricePrice).toHaveProperty('trend');
      expect(ricePrice.unit).toBe('IDR/kg');

      const unknownPrice = governmentClient.getMarketPrices('unknown');
      expect(unknownPrice.current).toBe(0);
    });

    test('assessRegionalSuitability should return correct suitability', () => {
      // Java region (rice suitable)
      const javaSuitability = governmentClient.assessRegionalSuitability(-7, 110, 'rice');
      expect(javaSuitability).toBe('High');

      // Sumatra region (palm oil suitable)
      const sumatraSuitability = governmentClient.assessRegionalSuitability(2, 100, 'palm oil');
      expect(javaSuitability).toBe('High');

      // Unknown region
      const unknownSuitability = governmentClient.assessRegionalSuitability(-20, 140, 'rice');
      expect(unknownSuitability).toBe('Medium');
    });

    test('analyzeBPSData should calculate scores correctly', () => {
      const mockBpsData = {
        datasets: [
          { subject: '557', tables: [{}, {}] },
          { subject: '558', tables: [{}] }
        ],
        location: { domain: '3200' } // Local data
      };

      const score = governmentClient.analyzeBPSData(mockBpsData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(80);
    });

    test('analyzeSatuData should calculate scores correctly', () => {
      const mockSatuData = {
        totalDatasets: 5,
        mostRelevant: { title: '2023 Agricultural Census' }
      };

      const score = governmentClient.analyzeSatuData(mockSatuData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(60);
    });

    test('analyzeBDSPData should calculate scores correctly', () => {
      const mockBdspData = {
        regionalInfo: { suitability: 'High' },
        commodityData: { supportPrograms: ['program1', 'program2'] }
      };

      const score = governmentClient.analyzeBDSPData(mockBdspData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(70);
    });
  });

  describe('WeatherClient', () => {
    let weatherClient;

    beforeEach(() => {
      weatherClient = new WeatherClient();
    });

    test('should initialize with correct configuration', () => {
      expect(weatherClient).toBeInstanceOf(WeatherClient);
      expect(weatherClient.openMeteoBaseUrl).toBe('https://api.open-meteo.com/v1');
      expect(weatherClient.openWeatherBaseUrl).toBe('https://api.openweathermap.org/data/3.0/onecall');
    });

    test('getIndonesianRegion should return correct regions', () => {
      expect(weatherClient.getIndonesianRegion(-6.2, 106.8)).toBe('Jakarta');
      expect(weatherClient.getIndonesianRegion(-6.9, 107.6)).toBe('West Java');
      expect(weatherClient.getIndonesianRegion(-7.3, 110.0)).toBe('Central Java');
      expect(weatherClient.getIndonesianRegion(-20, 140)).toBe('Indonesia');
    });

    test('assessCropDroughtTolerance should return correct tolerance levels', () => {
      expect(weatherClient.assessCropDroughtTolerance('rice')).toBe('Low');
      expect(weatherClient.assessCropDroughtTolerance('palm oil')).toBe('Medium');
      expect(weatherClient.assessCropDroughtTolerance('coffee')).toBe('Medium');
      expect(weatherClient.assessCropDroughtTolerance('unknown')).toBe('Medium');
    });

    test('analyzeOpenMeteoData should calculate scores correctly', () => {
      const mockOpenMeteoData = {
        daily: {
          precipitation_sum: [5, 10, 15, 0, 8, 12, 3],
          temperature_2m_max: [28, 30, 32, 29, 31, 27, 26],
          temperature_2m_min: [22, 24, 25, 23, 24, 21, 20]
        },
        historical: { available: true }
      };

      const score = weatherClient.analyzeOpenMeteoData(mockOpenMeteoData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(70);
    });

    test('analyzeOpenWeatherData should calculate scores correctly', () => {
      const mockOpenWeatherData = {
        current: {
          main: { temp: 25, humidity: 65 }
        },
        forecast: {
          list: [{}, {}, {}, {}, {}] // 5-day forecast
        }
      };

      const score = weatherClient.analyzeOpenWeatherData(mockOpenWeatherData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(65);
    });

    test('analyzeDroughtRisk should return correct scores', () => {
      expect(weatherClient.analyzeDroughtRisk({ riskLevel: 'Low' })).toBe(25);
      expect(weatherClient.analyzeDroughtRisk({ riskLevel: 'Medium' })).toBe(10);
      expect(weatherClient.analyzeDroughtRisk({ riskLevel: 'High' })).toBe(-20);
      expect(weatherClient.analyzeDroughtRisk({ riskLevel: 'Unknown' })).toBe(0);
    });
  });

  describe('PaymentClient', () => {
    let paymentClient;

    beforeEach(() => {
      paymentClient = new PaymentClient();
    });

    test('should initialize with correct configuration', () => {
      expect(paymentClient).toBeInstanceOf(PaymentClient);
      expect(paymentClient.ovoApiUrl).toBe('https://api.ovo.id/partner');
      expect(paymentClient.danaApiUrl).toBe('https://api.dana.id/business');
      expect(paymentClient.qrisApiUrl).toBe('https://api.qris.id/v1');
    });

    test('analyzeOVOOpportunity should calculate scores correctly', () => {
      const mockOvoData = {
        eligibility: 'High',
        marketOpportunity: { targetUserBase: '110 million users' },
        integrationOptions: [
          { type: 'SNAP Payment API' },
          { type: 'Push to Pay API' }
        ]
      };

      const score = paymentClient.analyzeOVOOpportunity(mockOvoData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(60);
    });

    test('analyzeGoPayOpportunity should calculate scores correctly', () => {
      const mockGoPayData = {
        strategy: 'GoTo Ecosystem Integration',
        integrationMethods: [
          { provider: 'Adyen' },
          { provider: 'PPRO' },
          { provider: 'Direct API' }
        ],
        agriculturalBenefits: { ruralReach: 'Growing' }
      };

      const score = paymentClient.analyzeGoPayOpportunity(mockGoPayData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(55);
    });

    test('analyzeDANAOpportunity should calculate scores correctly', () => {
      const mockDanaData = {
        suitability: 'High',
        keyAdvantages: { userBase: '200 million users' },
        agriculturalSuitability: { ruralFocus: true }
      };

      const score = paymentClient.analyzeDANAOpportunity(mockDanaData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(70);
    });

    test('analyzeTelcoOpportunity should calculate scores correctly', () => {
      const mockTelcoData = {
        mobileUsage: 'High',
        businessValue: { creditScoreImprovement: '20%' },
        majorTelcoPartners: [
          { name: 'Telkomsel' },
          { name: 'XL Axiata' },
          { name: 'Indosat Ooredoo' }
        ]
      };

      const score = paymentClient.analyzeTelcoOpportunity(mockTelcoData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(50);
    });

    test('analyzeQRISOpportunity should calculate scores correctly', () => {
      const mockQrisData = {
        universality: 'National Payment Standard',
        keyBenefits: { governmentSupport: true },
        agriculturalApplications: [
          { useCase: 'Market Payment' },
          { useCase: 'Credit Disbursement' },
          { useCase: 'Input Purchase' }
        ]
      };

      const score = paymentClient.analyzeQRISOpportunity(mockQrisData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(65);
    });
  });

  describe('Cross-Component Integration', () => {
    test('All clients should handle null/undefined inputs gracefully', () => {
      const satelliteClient = new SatelliteClient();
      const governmentClient = new IndonesiaGovernmentClient();
      const weatherClient = new WeatherClient();
      const paymentClient = new PaymentClient();

      // Test null handling
      expect(satelliteClient.categorizeVegetationHealth(null)).toBe('Unknown');
      expect(satelliteClient.categorizeTerrainSuitability(null)).toBe('Unknown');
      expect(governmentClient.getCropCategory(null)).toBe('General Agriculture');
      expect(weatherClient.assessCropDroughtTolerance(null)).toBe('Medium');
    });

    test('Score calculations should be within expected ranges', () => {
      const satelliteClient = new SatelliteClient();
      
      // Test score bounds
      const mockGeeData = {
        currentIndices: { ndvi: 1.0, evi: 1.0, savi: 1.0 }
      };
      
      const vegScore = satelliteClient.analyzeGEEVegetation(mockGeeData);
      expect(vegScore).toBeLessThanOrEqual(120);
      
      const mockTerrainData = {
        terrainData: { slope: 0, elevation: 500 }
      };
      
      const terrainScore = satelliteClient.analyzeGEETerrain(mockTerrainData);
      expect(terrainScore).toBeLessThanOrEqual(60);
    });

    test('Credit scoring should be consistent across components', () => {
      const satelliteClient = new SatelliteClient();
      
      // Test various credit scores
      const scores = [300, 450, 550, 650, 750, 850];
      const farmSize = 2.0;
      
      scores.forEach(score => {
        const eligibility = satelliteClient.determineLoanEligibility(score, farmSize);
        expect(eligibility).toHaveProperty('status');
        expect(eligibility).toHaveProperty('maxLoan');
        expect(eligibility).toHaveProperty('interestRate');
        expect(eligibility).toHaveProperty('approvalProbability');
        
        // Validate ranges
        expect(eligibility.maxLoan).toBeGreaterThan(0);
        expect(eligibility.interestRate).toBeGreaterThan(0);
        expect(eligibility.approvalProbability).toBeGreaterThan(0);
        expect(eligibility.approvalProbability).toBeLessThanOrEqual(100);
      });
    });
  });
});