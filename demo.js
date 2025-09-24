const SatelliteClient = require('./lib/satellite-client');
const fs = require('fs');
const path = require('path');

async function runRealDemo() {
  console.log('🚀 AGRI-ACCESS REAL SATELLITE DATA DEMONSTRATION');
  console.log('==================================================');
  console.log('Testing Real NASA Satellite Data Processing for Indonesian Agriculture\n');

  const client = new SatelliteClient();

  // Demo scenarios with real Indonesian coordinates
  const scenarios = [
    {
      farmerName: 'Ibu Siti Nurhasanah',
      latitude: -6.7749,
      longitude: 107.1389,
      farmSize: 1.5,
      primaryCrop: 'rice',
      region: 'West Java',
      description: 'Traditional rice farmer seeking fertilizer loan'
    },
    {
      farmerName: 'Pak Budi Santoso',
      latitude: -2.5489,
      longitude: 99.6401,
      farmSize: 3.2,
      primaryCrop: 'palm oil',
      region: 'North Sumatra',
      description: 'Palm oil farmer planning sustainable expansion'
    },
    {
      farmerName: 'Ibu Ratna Sari',
      latitude: -7.6145,
      longitude: 109.3425,
      farmSize: 0.8,
      primaryCrop: 'coffee',
      region: 'Central Java',
      description: 'Highland coffee farmer needing processing equipment'
    }
  ];

  const results = [];
  let successCount = 0;
  let totalDataRetrieved = 0;

  for (const [index, scenario] of scenarios.entries()) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`SCENARIO ${index + 1}: ${scenario.farmerName.toUpperCase()}`);
    console.log(`${scenario.description}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Process satellite data for this farmer
      const satelliteData = await client.getRealSatelliteDataForLocation(scenario);
      
      // Display real results (no fake success messages)
      console.log('\n📊 REAL SATELLITE DATA ANALYSIS RESULTS:');
      console.log('-'.repeat(50));
      
      displayRealAnalysisResults(satelliteData);
      
      // Only calculate impact if we have real data
      if (satelliteData.success) {
        const economicImpact = calculateEconomicImpact(satelliteData);
        displayEconomicImpact(economicImpact);
        successCount++;
      } else {
        console.log('\n💡 ANALYSIS LIMITATIONS:');
        console.log('   ⚠️ Credit scoring not possible without satellite data');
        console.log('   ⚠️ Economic impact calculations require real satellite inputs');
        console.log('   ⚠️ Risk assessment limited to basic demographic factors');
      }
      
      // Count actual data retrieved
      if (satelliteData.gfsadData.available) totalDataRetrieved++;
      if (satelliteData.modisData.available) totalDataRetrieved++;
      totalDataRetrieved += satelliteData.browseImages.length;
      
      // Save realistic report
      const reportData = {
        farmer: scenario,
        satelliteData: satelliteData,
        timestamp: new Date().toISOString(),
        dataRetrievalSuccess: satelliteData.success,
        errors: satelliteData.errors || []
      };
      
      const reportPath = path.join(__dirname, `real-report-${scenario.farmerName.replace(/\s+/g, '-').toLowerCase()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      console.log(`\n📄 Real data report saved to: ${reportPath}`);
      
      results.push({
        farmer: scenario.farmerName,
        success: satelliteData.success,
        analysis: satelliteData.analysisResults,
        dataAvailable: {
          gfsad: satelliteData.gfsadData.available,
          modis: satelliteData.modisData.available,
          browseImages: satelliteData.browseImages.length
        },
        errors: satelliteData.errors
      });

    } catch (error) {
      console.error(`❌ Critical error processing ${scenario.farmerName}: ${error.message}`);
      results.push({
        farmer: scenario.farmerName,
        success: false,
        error: error.message
      });
    }
  }

  // Generate honest summary report
  generateHonestSummaryReport(results, successCount, totalDataRetrieved);
  
  console.log('\n' + '='.repeat(80));
  console.log('🌟 REAL AGRI-ACCESS DEMONSTRATION COMPLETED');
  console.log('='.repeat(80));
  
  console.log('\n🎯 ACTUAL RESULTS:');
  console.log(`   📊 Farmers analyzed: ${results.length}`);
  console.log(`   ✅ Successful satellite data retrieval: ${successCount}/${results.length}`);
  console.log(`   🛰️ Total satellite datasets retrieved: ${totalDataRetrieved}`);
  console.log(`   ⚠️ API failures: ${results.length - successCount}`);
  
  if (successCount > 0) {
    console.log('\n📱 IMPLEMENTATION READINESS:');
    console.log('   ✅ NASA API integration functional');
    console.log('   ✅ Real satellite data processing working');
    console.log('   ✅ Geographic filtering operational');
    console.log('   ✅ Ready for pilot deployment with available data');
  } else {
    console.log('\n⚠️ IMPLEMENTATION CHALLENGES:');
    console.log('   ❌ NASA API access issues detected');
    console.log('   ❌ Satellite data retrieval failures');
    console.log('   💡 Recommend API authentication review');
    console.log('   💡 Consider alternative data sources as backup');
  }
  
  console.log('\n🏁 Real demonstration completed - no simulated data used!');
}

function displayRealAnalysisResults(satelliteData) {
  const farmData = satelliteData.farmInfo;
  
  console.log(`📋 FARMER PROFILE:`);
  console.log(`   Name: ${farmData.farmerName}`);
  console.log(`   Location: ${farmData.latitude}°N, ${farmData.longitude}°E`);
  console.log(`   Farm Size: ${farmData.farmSize} hectares`);
  console.log(`   Primary Crop: ${farmData.primaryCrop}`);

  console.log(`\n🛰️ SATELLITE DATA STATUS:`);
  console.log(`   GFSAD30SEACE Available: ${satelliteData.gfsadData.available ? '✅' : '❌'}`);
  console.log(`   MODIS Data Available: ${satelliteData.modisData.available ? '✅' : '❌'}`);
  console.log(`   Browse Images Found: ${satelliteData.browseImages.length}`);
  
  if (satelliteData.errors.length > 0) {
    console.log(`\n⚠️ DATA RETRIEVAL ERRORS:`);
    satelliteData.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
  }

  if (satelliteData.success && satelliteData.analysisResults.creditScore) {
    console.log(`\n📊 CREDIT ANALYSIS (Based on Real Data):`);
    console.log(`   Credit Score: ${satelliteData.analysisResults.creditScore}/850`);
    console.log(`   Rating: ${satelliteData.analysisResults.eligibility.status}`);
    console.log(`   Data Quality: ${satelliteData.analysisResults.dataQuality}`);
    console.log(`   Confidence: ${satelliteData.analysisResults.confidence}`);
    console.log(`   Maximum Loan: Rp ${(satelliteData.analysisResults.eligibility.maxLoan / 1000000).toFixed(1)}M`);
    console.log(`   Interest Rate: ${satelliteData.analysisResults.eligibility.interestRate}% annually`);
    console.log(`   Approval Probability: ${satelliteData.analysisResults.eligibility.approvalProbability}%`);
  } else {
    console.log(`\n❌ CREDIT ANALYSIS:`);
    console.log(`   Status: Unable to generate reliable credit score`);
    console.log(`   Reason: Insufficient satellite data`);
    console.log(`   Recommendation: Retry with alternative data sources`);
  }

  if (satelliteData.browseImages.length > 0) {
    console.log(`\n🖼️ SATELLITE IMAGERY AVAILABLE:`);
    satelliteData.browseImages.forEach((image, index) => {
      console.log(`   ${index + 1}. ${image.type}: ${image.description}`);
      console.log(`      URL: ${image.url}`);
    });
  } else {
    console.log(`\n🖼️ SATELLITE IMAGERY:`);
    console.log(`   ❌ No browse images available for this location`);
  }
}

function calculateEconomicImpact(satelliteData) {
  if (!satelliteData.success || !satelliteData.analysisResults.creditScore) {
    return {
      possible: false,
      reason: 'No reliable satellite data for economic analysis'
    };
  }

  const eligibility = satelliteData.analysisResults.eligibility;
  const farmSize = satelliteData.farmInfo.farmSize;
  
  // Traditional lending rates vs KUR rates
  const currentRate = 26; // Informal lender rate
  const newRate = eligibility.interestRate;
  const rateDifference = currentRate - newRate;
  
  // Calculate savings
  const traditionalMaxLoan = farmSize * 3000000; // Conservative traditional lending
  const newMaxLoan = eligibility.maxLoan;
  const additionalCapital = newMaxLoan - traditionalMaxLoan;
  
  const annualInterestSavings = (rateDifference / 100) * newMaxLoan;
  const productivityGain = (rateDifference / currentRate) * 0.8; // 80% of rate improvement
  const estimatedIncomeIncrease = productivityGain * farmSize * 15000000; // Estimated income per hectare
  
  const totalAnnualBenefit = annualInterestSavings + estimatedIncomeIncrease;

  return {
    possible: true,
    traditionalLending: {
      interestRate: currentRate,
      maxLoan: traditionalMaxLoan,
      annualInterest: (currentRate / 100) * traditionalMaxLoan
    },
    agriAccessLending: {
      interestRate: newRate,
      maxLoan: newMaxLoan,
      annualInterest: (newRate / 100) * newMaxLoan
    },
    benefits: {
      interestRateReduction: rateDifference,
      annualInterestSavings: annualInterestSavings,
      loanAmountIncrease: ((newMaxLoan / traditionalMaxLoan) - 1) * 100,
      additionalCapital: additionalCapital,
      productivityGain: productivityGain * 100,
      estimatedIncomeIncrease: estimatedIncomeIncrease,
      totalAnnualBenefit: totalAnnualBenefit
    }
  };
}

function displayEconomicImpact(impact) {
  if (!impact.possible) {
    console.log(`\n💰 ECONOMIC IMPACT ANALYSIS:`);
    console.log(`   ❌ Not possible: ${impact.reason}`);
    return;
  }

  console.log(`\n💰 ECONOMIC IMPACT ANALYSIS:`);
  console.log(`   BEFORE AGRI-ACCESS:`);
  console.log(`   • Interest Rate: ${impact.traditionalLending.interestRate}% (informal lender)`);
  console.log(`   • Max Loan: Rp ${(impact.traditionalLending.maxLoan / 1000000).toFixed(1)}M`);
  console.log(`   • Annual Interest: Rp ${(impact.traditionalLending.annualInterest / 1000000).toFixed(1)}M`);

  console.log(`\n   AFTER AGRI-ACCESS:`);
  console.log(`   • Interest Rate: ${impact.agriAccessLending.interestRate}% (formal bank)`);
  console.log(`   • Max Loan: Rp ${(impact.agriAccessLending.maxLoan / 1000000).toFixed(1)}M`);
  console.log(`   • Annual Interest: Rp ${(impact.agriAccessLending.annualInterest / 1000000).toFixed(1)}M`);

  console.log(`\n   FINANCIAL BENEFITS:`);
  console.log(`   • Interest Rate Reduction: ${impact.benefits.interestRateReduction.toFixed(1)}%`);
  console.log(`   • Annual Interest Savings: Rp ${(impact.benefits.annualInterestSavings / 1000000).toFixed(1)}M`);
  console.log(`   • Loan Amount Increase: ${impact.benefits.loanAmountIncrease.toFixed(0)}%`);
  console.log(`   • Additional Capital: Rp ${(impact.benefits.additionalCapital / 1000000).toFixed(1)}M`);

  console.log(`\n   PRODUCTIVITY IMPACT:`);
  console.log(`   • Expected Productivity Gain: ${impact.benefits.productivityGain.toFixed(1)}%`);
  console.log(`   • Estimated Income Increase: Rp ${(impact.benefits.estimatedIncomeIncrease / 1000000).toFixed(1)}M`);
  console.log(`   • Total Annual Benefit: Rp ${(impact.benefits.totalAnnualBenefit / 1000000).toFixed(1)}M`);
}

function generateHonestSummaryReport(results, successCount, totalDataRetrieved) {
  const summary = {
    timestamp: new Date().toISOString(),
    demonstration: {
      totalFarmers: results.length,
      successfulAnalyses: successCount,
      failedAnalyses: results.length - successCount,
      totalSatelliteDatasets: totalDataRetrieved,
      farmersAnalyzed: results.filter(r => r.success).map(r => ({
        name: r.farmer,
        success: r.success,
        creditScore: r.analysis?.creditScore || null,
        dataQuality: r.analysis?.dataQuality || 'No data',
        gfsadAvailable: r.dataAvailable?.gfsad || false,
        modisAvailable: r.dataAvailable?.modis || false,
        browseImages: r.dataAvailable?.browseImages || 0
      }))
    },
    systemCapabilities: {
      satelliteDataIntegration: successCount > 0,
      realTimeProcessing: true,
      indonesianCoverage: true,
      apiConnectivity: successCount > 0 ? 'Operational' : 'Issues detected'
    },
    implementationReadiness: {
      technicalArchitecture: successCount > 0 ? 'Functional' : 'Needs debugging',
      dataAvailability: totalDataRetrieved > 0 ? 'Limited' : 'No data retrieved',
      pilotReadiness: successCount >= 2 ? 'Ready' : 'Not ready',
      scalingPotential: successCount === results.length ? 'High' : 'Limited'
    },
    nextSteps: successCount > 0 ? 
      ['Optimize NASA API access', 'Expand geographic coverage', 'Integrate additional data sources'] :
      ['Debug NASA API connectivity', 'Review authentication', 'Implement fallback data sources']
  };

  const summaryPath = path.join(__dirname, 'agri-access-real-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`\n📄 Honest summary report saved: ${summaryPath}`);
}

// Run the demonstration
runRealDemo().catch(error => {
  console.error('❌ Demo failed:', error.message);
  process.exit(1);
});