const axios = require('axios');

class IndonesiaGovernmentClient {
  constructor() {
    this.bpsApiUrl = 'https://webapi.bps.go.id/v1';
    this.satudataApiUrl = 'https://data.go.id/api/3';
    this.bdspApiUrl = 'https://bdsp2.pertanian.go.id/api';
    
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Agri-Access/2.0'
      }
    });

    this.bpsApiKey = process.env.BPS_API_KEY;
    this.satudataApiKey = process.env.SATUDATA_API_KEY;
  }

  async getAgriculturalStatistics(farmData) {
    return {
      farmInfo: farmData,
      bpsData: { available: false, reason: 'API not configured' },
      satudataData: { available: false, reason: 'API not configured' },
      bdspData: { available: false, reason: 'API not configured' },
      analysisResults: { 
        error: 'No government APIs available', 
        scoreContribution: 0,
        note: 'Government data integration placeholder - no real APIs configured'
      },
      success: false,
      errors: ['Government APIs not available'],
      dataSources: []
    };
  }

  async getBPSAgriculturalData(farmData) {
    // Determine province and regency from coordinates
    const locationInfo = this.getLocationFromCoordinates(farmData.latitude, farmData.longitude);
    
    try {
      const datasets = [];
      
      // Search for agricultural statistics datasets
      const agriculturalSubjects = [
        '557', // Agriculture, Forestry, Fisheries
        '558', // Crop Production
        '559', // Livestock
        '560'  // Agricultural Economics
      ];

      for (const subjectId of agriculturalSubjects) {
        try {
          const params = {
            subject: subjectId,
            domain: locationInfo.domain || '0000', // National if no specific domain
            lang: 'en'
          };

          if (this.bpsApiKey) {
            params.key = this.bpsApiKey;
          }

          const response = await this.client.get(`${this.bpsApiUrl}/list`, { params });
          
          if (response.data && response.data.data && response.data.data.length > 0) {
            datasets.push({
              subject: subjectId,
              subjectName: this.getSubjectName(subjectId),
              tables: response.data.data.slice(0, 5), // Limit to 5 most relevant tables
              domain: locationInfo.domain,
              regionName: locationInfo.name
            });
          }
        } catch (subjectError) {
          console.log(`   ⚠️ Could not fetch subject ${subjectId}: ${subjectError.message}`);
        }
      }

      if (datasets.length === 0) {
        // Fallback: Get general agricultural data without specific location
        try {
          const fallbackResponse = await this.client.get(`${this.bpsApiUrl}/list`, {
            params: {
              subject: '557',
              domain: '0000',
              lang: 'en',
              ...(this.bpsApiKey && { key: this.bpsApiKey })
            }
          });

          if (fallbackResponse.data && fallbackResponse.data.data) {
            datasets.push({
              subject: '557',
              subjectName: 'Agriculture, Forestry, Fisheries (National)',
              tables: fallbackResponse.data.data.slice(0, 3),
              domain: '0000',
              regionName: 'Indonesia'
            });
          }
        } catch (fallbackError) {
          throw new Error(`No BPS agricultural data available: ${fallbackError.message}`);
        }
      }

      return {
        available: true,
        datasets: datasets,
        location: locationInfo,
        totalTables: datasets.reduce((sum, dataset) => sum + dataset.tables.length, 0),
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`BPS API error: ${error.message}`);
    }
  }

  async getSatuDataAgriculturalCensus(farmData) {
    try {
      // Search for agricultural census and land use datasets
      const searchQueries = [
        'sensus pertanian',
        'agricultural census',
        'penggunaan lahan',
        'land use',
        'crop production',
        'produksi tanaman'
      ];

      const datasets = [];

      for (const query of searchQueries) {
        try {
          const params = {
            q: query,
            rows: 5,
            sort: 'metadata_modified desc'
          };

          if (this.satudataApiKey) {
            params.api_key = this.satudataApiKey;
          }

          const response = await this.client.get(`${this.satudataApiUrl}/action/package_search`, { params });
          
          if (response.data && response.data.result && response.data.result.results) {
            const relevantDatasets = response.data.result.results.filter(dataset => 
              dataset.title.toLowerCase().includes('pertanian') || 
              dataset.title.toLowerCase().includes('agriculture') ||
              dataset.title.toLowerCase().includes('lahan') ||
              dataset.title.toLowerCase().includes('land')
            );

            if (relevantDatasets.length > 0) {
              datasets.push({
                query: query,
                datasets: relevantDatasets.slice(0, 3),
                count: relevantDatasets.length
              });
            }
          }
        } catch (queryError) {
          console.log(`   ⚠️ Could not search for '${query}': ${queryError.message}`);
        }
      }

      if (datasets.length === 0) {
        return { available: false, reason: 'No agricultural datasets found in Satu Data portal' };
      }

      return {
        available: true,
        searchResults: datasets,
        totalDatasets: datasets.reduce((sum, result) => sum + result.datasets.length, 0),
        mostRelevant: datasets[0]?.datasets[0] || null,
        portalUrl: 'https://data.go.id',
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Satu Data API error: ${error.message}`);
    }
  }

  async getBDSPData(farmData) {
    // Since BDSP doesn't have a publicly documented API, 
    // we'll simulate data structure based on known capabilities
    try {
      const cropMapping = {
        'rice': 'padi',
        'palm oil': 'kelapa sawit',
        'coffee': 'kopi',
        'cocoa': 'kakao',
        'rubber': 'karet'
      };

      const indonesianCrop = cropMapping[farmData.primaryCrop] || farmData.primaryCrop;

      // This would be actual API calls in a real implementation
      // For now, we structure the expected data format
      const simulatedData = {
        available: true,
        commodityData: {
          name: indonesianCrop,
          englishName: farmData.primaryCrop,
          category: this.getCropCategory(farmData.primaryCrop),
          productionRegions: this.getProductionRegions(farmData.primaryCrop),
          marketPrices: this.getMarketPrices(farmData.primaryCrop),
          seasonalInfo: this.getSeasonalInfo(farmData.primaryCrop),
          supportPrograms: this.getSupportPrograms(farmData.primaryCrop)
        },
        regionalInfo: {
          suitability: this.assessRegionalSuitability(farmData.latitude, farmData.longitude, farmData.primaryCrop),
          nearbyFarmers: this.estimateNearbyFarmers(farmData.latitude, farmData.longitude),
          infrastructure: this.assessInfrastructure(farmData.latitude, farmData.longitude)
        },
        source: 'Ministry of Agriculture BDSP (Database Agricultural Statistics)',
        lastUpdated: new Date().toISOString(),
        note: 'Data simulated based on BDSP structure - would be actual API calls in production'
      };

      return simulatedData;

    } catch (error) {
      throw new Error(`BDSP data error: ${error.message}`);
    }
  }

  generateGovernmentDataAnalysis(governmentData) {
    console.log(`   🏛️ Analyzing Indonesian government data...`);
    
    let scoreContribution = 0;
    let confidence = 'Limited';
    let dataQuality = 'Basic';
    const insights = [];

    // BPS Data Analysis
    if (governmentData.bpsData?.available) {
      const bpsScore = this.analyzeBPSData(governmentData.bpsData);
      scoreContribution += bpsScore;
      insights.push(`BPS Statistics: ${governmentData.bpsData.totalTables} agricultural datasets available`);
      console.log(`   📊 BPS score contribution: +${bpsScore} points`);
    }

    // Satu Data Analysis
    if (governmentData.satudataData?.available) {
      const satudataScore = this.analyzeSatuData(governmentData.satudataData);
      scoreContribution += satudataScore;
      insights.push(`Agricultural Census: ${governmentData.satudataData.totalDatasets} relevant datasets`);
      console.log(`   📊 Satu Data score contribution: +${satudataScore} points`);
    }

    // BDSP Analysis
    if (governmentData.bdspData?.available) {
      const bdspScore = this.analyzeBDSPData(governmentData.bdspData);
      scoreContribution += bdspScore;
      insights.push(`Ministry of Agriculture: Commodity and market data available`);
      console.log(`   📊 BDSP score contribution: +${bdspScore} points`);
    }

    // Determine overall confidence and quality
    const dataSourceCount = governmentData.dataSources.length;
    if (dataSourceCount >= 3) {
      confidence = 'Very Strong';
      dataQuality = 'Comprehensive';
    } else if (dataSourceCount >= 2) {
      confidence = 'Strong';
      dataQuality = 'Good';
    } else if (dataSourceCount >= 1) {
      confidence = 'Moderate';
      dataQuality = 'Fair';
    }

    return {
      scoreContribution: Math.round(scoreContribution),
      confidence: confidence,
      dataQuality: dataQuality,
      insights: insights,
      dataSourceCount: dataSourceCount,
      governmentValidation: true,
      officialDataSupport: dataSourceCount > 0,
      bpsSupported: !!governmentData.bpsData?.available,
      censusData: !!governmentData.satudataData?.available,
      ministerialData: !!governmentData.bdspData?.available
    };
  }

  analyzeBPSData(bpsData) {
    // Score based on availability and breadth of BPS data
    let score = 30; // Base score for having BPS data
    
    // Bonus for multiple subjects
    const subjectCount = bpsData.datasets.length;
    score += Math.min(subjectCount * 10, 40); // Up to 40 points for multiple subjects
    
    // Bonus for local vs national data
    if (bpsData.location && bpsData.location.domain !== '0000') {
      score += 20; // Local data more relevant
    }
    
    return Math.min(score, 80); // Cap at 80 points
  }

  analyzeSatuData(satudataData) {
    // Score based on agricultural census and land use data
    let score = 25; // Base score for having census data
    
    // Bonus for dataset variety
    const datasetCount = satudataData.totalDatasets;
    score += Math.min(datasetCount * 5, 30); // Up to 30 points for dataset variety
    
    // Bonus for having recent agricultural census
    if (satudataData.mostRelevant?.title.includes('2023')) {
      score += 25; // Recent census data
    }
    
    return Math.min(score, 60); // Cap at 60 points
  }

  analyzeBDSPData(bdspData) {
    // Score based on commodity and market data
    let score = 20; // Base score for having ministry data
    
    // Bonus for regional suitability
    if (bdspData.regionalInfo?.suitability === 'High') {
      score += 30;
    } else if (bdspData.regionalInfo?.suitability === 'Medium') {
      score += 15;
    }
    
    // Bonus for support programs
    if (bdspData.commodityData?.supportPrograms?.length > 0) {
      score += 20;
    }
    
    return Math.min(score, 70); // Cap at 70 points
  }

  // Helper methods
  getLocationFromCoordinates(latitude, longitude) {
    // Simplified mapping - in production, use proper geocoding
    const regions = [
      { name: 'DKI Jakarta', domain: '3100', lat: -6.2, lon: 106.8, radius: 0.5 },
      { name: 'West Java', domain: '3200', lat: -6.9, lon: 107.6, radius: 2.0 },
      { name: 'Central Java', domain: '3300', lat: -7.3, lon: 110.0, radius: 2.0 },
      { name: 'East Java', domain: '3500', lat: -7.8, lon: 112.5, radius: 2.0 },
      { name: 'North Sumatra', domain: '1200', lat: 3.6, lon: 98.7, radius: 3.0 },
      { name: 'South Sumatra', domain: '1600', lat: -3.0, lon: 104.0, radius: 3.0 }
    ];

    for (const region of regions) {
      const distance = Math.sqrt(
        Math.pow(latitude - region.lat, 2) + Math.pow(longitude - region.lon, 2)
      );
      if (distance <= region.radius) {
        return { name: region.name, domain: region.domain };
      }
    }

    return { name: 'Indonesia', domain: '0000' }; // Default to national
  }

  getSubjectName(subjectId) {
    const subjects = {
      '557': 'Agriculture, Forestry, Fisheries',
      '558': 'Crop Production',
      '559': 'Livestock',
      '560': 'Agricultural Economics'
    };
    return subjects[subjectId] || `Subject ${subjectId}`;
  }

  getCropCategory(crop) {
    const categories = {
      'rice': 'Food Crops',
      'palm oil': 'Plantation Crops',
      'coffee': 'Plantation Crops',
      'cocoa': 'Plantation Crops',
      'rubber': 'Plantation Crops'
    };
    return categories[crop] || 'General Agriculture';
  }

  getProductionRegions(crop) {
    const regions = {
      'rice': ['Central Java', 'East Java', 'West Java', 'South Sumatra'],
      'palm oil': ['Riau', 'North Sumatra', 'Central Kalimantan', 'West Kalimantan'],
      'coffee': ['South Sumatra', 'Lampung', 'East Java', 'North Sumatra'],
      'cocoa': ['South Sulawesi', 'Southeast Sulawesi', 'Central Sulawesi', 'West Sumatra'],
      'rubber': ['South Sumatra', 'Jambi', 'Riau', 'West Kalimantan']
    };
    return regions[crop] || ['Various regions'];
  }

  getMarketPrices(crop) {
    // Simulated current market prices (would be from actual BDSP API)
    const prices = {
      'rice': { current: 7500, unit: 'IDR/kg', trend: 'stable' },
      'palm oil': { current: 12000, unit: 'IDR/kg', trend: 'increasing' },
      'coffee': { current: 45000, unit: 'IDR/kg', trend: 'stable' },
      'cocoa': { current: 35000, unit: 'IDR/kg', trend: 'decreasing' },
      'rubber': { current: 18000, unit: 'IDR/kg', trend: 'stable' }
    };
    return prices[crop] || { current: 0, unit: 'IDR/kg', trend: 'unknown' };
  }

  getSeasonalInfo(crop) {
    const seasons = {
      'rice': { plantingSeason: 'Oct-Dec, Mar-May', harvestSeason: 'Mar-May, Aug-Oct' },
      'palm oil': { plantingSeason: 'Year-round', harvestSeason: 'Year-round' },
      'coffee': { plantingSeason: 'Oct-Dec', harvestSeason: 'May-Aug' },
      'cocoa': { plantingSeason: 'Oct-Dec', harvestSeason: 'May-Aug' },
      'rubber': { plantingSeason: 'Nov-Jan', harvestSeason: 'Year-round (tapping)' }
    };
    return seasons[crop] || { plantingSeason: 'Variable', harvestSeason: 'Variable' };
  }

  getSupportPrograms(crop) {
    // Common Indonesian agricultural support programs
    return [
      'Subsidized Fertilizer Program',
      'Crop Insurance (AUTP)',
      'Agricultural Credit (KUR)',
      'Extension Services',
      'Market Price Stabilization'
    ];
  }

  assessRegionalSuitability(latitude, longitude, crop) {
    // Simplified suitability assessment based on known agricultural regions
    const suitabilityMap = {
      'rice': { 
        suitable: [[-8, -6], [106, 114]], // Java region roughly
        rating: 'High'
      },
      'palm oil': {
        suitable: [[-5, 5], [95, 117]], // Sumatra and Kalimantan
        rating: 'High'
      }
    };

    const cropSuitability = suitabilityMap[crop];
    if (cropSuitability) {
      const [latRange, lonRange] = cropSuitability.suitable;
      if (latitude >= latRange[0] && latitude <= latRange[1] && 
          longitude >= lonRange[0] && longitude <= lonRange[1]) {
        return 'High';
      }
    }

    return 'Medium'; // Default assumption for Indonesia
  }

  estimateNearbyFarmers(latitude, longitude) {
    // Estimate based on population density (simplified)
    // Java = high density, outer islands = lower density
    if (latitude >= -8 && latitude <= -6 && longitude >= 106 && longitude <= 114) {
      return 'High (Java region)';
    }
    return 'Medium';
  }

  assessInfrastructure(latitude, longitude) {
    // Simplified infrastructure assessment
    if (latitude >= -8 && latitude <= -6 && longitude >= 106 && longitude <= 114) {
      return 'Good (Java region - better road/market access)';
    }
    return 'Fair (Outer islands - developing infrastructure)';
  }
}

module.exports = IndonesiaGovernmentClient;