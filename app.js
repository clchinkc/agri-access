let map;
let farmMarker;
let satelliteBoundaries = [];
let currentSatelliteImages = [];

// NASA satellite data configuration (real APIs only)
const NASA_CONFIG = {
    baseUrl: 'https://cmr.earthdata.nasa.gov',
    collections: {
        gfsad: 'C2763261715-LPCLOUD',    // GFSAD30SEACE
        modis: 'C1000000240-LPDAAC_ECS'  // MOD13Q1 MODIS Vegetation
    },
    timeout: 15000 // Reduced timeout for honest testing
};

function initializeMap() {
    map = L.map('map').setView([-6.7749, 107.1389], 10);
    
    // Create custom pane for GEE rectangles (z-index: 1000)
    map.createPane('geePane');
    map.getPane('geePane').style.zIndex = 1000;
    map.getPane('geePane').style.pointerEvents = 'auto';
    
    const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    });
    
    const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri'
    });
    
    streetMap.addTo(map);
    
    const baseMaps = {
        "🗺️ Street Map": streetMap,
        "🛰️ Satellite": satelliteMap
    };
    
    L.control.layers(baseMaps).addTo(map);
    L.control.scale().addTo(map);
    
    updateFarmMarker();
}

function loadDemoLocation(farmer) {
    const demos = {
        siti: {
            name: 'Ibu Siti Nurhasanah',
            lat: -6.7749,
            lon: 107.1389,
            size: 1.5,
            crop: 'rice'
        },
        budi: {
            name: 'Pak Budi Santoso',
            lat: -2.5489,
            lon: 99.6401,
            size: 3.2,
            crop: 'palm oil'
        },
        ratna: {
            name: 'Ibu Ratna Sari',
            lat: -7.6145,
            lon: 109.3425,
            size: 0.8,
            crop: 'coffee'
        }
    };

    const demo = demos[farmer];
    document.getElementById('farmerName').value = demo.name;
    document.getElementById('latitude').value = demo.lat;
    document.getElementById('longitude').value = demo.lon;
    document.getElementById('farmSize').value = demo.size;
    document.getElementById('primaryCrop').value = demo.crop;
    
    // Clear Basel III override inputs when loading demo locations
    document.getElementById('probabilityOfDefaultInput').value = '';
    document.getElementById('lossGivenDefaultInput').value = '';
    document.getElementById('exposureAtDefaultInput').value = '';
    
    map.setView([demo.lat, demo.lon], 12);
    updateFarmMarker();
    clearResults();
}

function updateFarmMarker() {
    const lat = parseFloat(document.getElementById('latitude').value);
    const lon = parseFloat(document.getElementById('longitude').value);
    const name = document.getElementById('farmerName').value;
    
    if (farmMarker) {
        map.removeLayer(farmMarker);
    }
    
    farmMarker = L.marker([lat, lon], {
        icon: L.divIcon({
            className: 'farm-marker',
            html: `<div style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${name}</div>`,
            iconSize: [120, 30],
            iconAnchor: [60, 15]
        })
    }).addTo(map);
}

let coverageRectangles = [];

function addDataCoverageBounds(result) {
    // Clear existing rectangles
    coverageRectangles.forEach(rect => map.removeLayer(rect));
    coverageRectangles = [];

    // Add GFSAD bounding box if available (add first, lower layer)
    if (result.gfsadData && result.gfsadData.available && result.gfsadData.bbox && result.gfsadData.bbox !== 'Global coverage') {
        const bbox = result.gfsadData.bbox.split(',').map(parseFloat);
        if (bbox.length === 4) {
            const [west, south, east, north] = bbox;
            const gfsadRect = L.rectangle([[south, west], [north, east]], {
                color: '#4CAF50',
                fillColor: '#4CAF50',
                fillOpacity: 0.1,
                weight: 2
            }).bindPopup(`
                <div style="font-family: Arial, sans-serif;">
                    <strong>🗺️ GFSAD30SEACE Coverage</strong><br>
                    <small>Cropland Classification (30m resolution)</small><br>
                    <strong>Data Size:</strong> ${result.gfsadData.dataSize}MB<br>
                    <strong>Updated:</strong> ${new Date(result.gfsadData.updated).toLocaleDateString()}
                </div>
            `).addTo(map);
            coverageRectangles.push(gfsadRect);
        }
    }

    // Add MODIS bounding box if available
    if (result.modisData && result.modisData.available && result.modisData.bbox && result.modisData.bbox !== 'Global coverage') {
        const bbox = result.modisData.bbox.split(',').map(parseFloat);
        if (bbox.length === 4) {
            const [west, south, east, north] = bbox;
            const modisRect = L.rectangle([[south, west], [north, east]], {
                color: '#FF9800',
                fillColor: '#FF9800',
                fillOpacity: 0.1,
                weight: 2
            }).bindPopup(`
                <div style="font-family: Arial, sans-serif;">
                    <strong>🌱 MODIS Coverage</strong><br>
                    <small>Vegetation Index (250m resolution)</small><br>
                    <strong>Data Size:</strong> ${result.modisData.dataSize}MB<br>
                    <strong>Period:</strong> ${new Date(result.modisData.timeStart).toLocaleDateString()} - ${new Date(result.modisData.timeEnd).toLocaleDateString()}
                </div>
            `).addTo(map);
            coverageRectangles.push(modisRect);
        }
    }

    // Add Google Earth Engine image bounding boxes last (top layer)
    if (result.browseImages && result.browseImages.length > 0) {
        result.browseImages.forEach((image, index) => {
            if (image.bbox && image.priority === 1) { // Only GEE images (priority 1)
                const bbox = image.bbox;
                // Make GEE rectangles consistent with GFSAD/MODIS style
                const buffer = 0.002; // Small buffer to make them more visible
                const geeRect = L.rectangle([
                    [bbox.south - buffer, bbox.west - buffer], 
                    [bbox.north + buffer, bbox.east + buffer]
                ], {
                    color: '#2196F3',
                    fillColor: '#2196F3',
                    fillOpacity: 0.1,
                    weight: 2,
                    pane: 'geePane',
                    interactive: true
                }).bindPopup(`
                    <div style="font-family: Arial, sans-serif;">
                        <strong>🌍 ${image.type}</strong><br>
                        <small>${image.description}</small><br>
                        <strong>Resolution:</strong> ${image.resolution}<br>
                        <strong>Source:</strong> ${image.source}
                    </div>
                `).addTo(map);
                
                // Ensure GEE rectangles stay on top
                geeRect.bringToFront();
                geeRect.on('mouseover', function() { this.bringToFront(); });
                
                coverageRectangles.push(geeRect);
            }
        });
    }
}

async function analyzeWithRealNASAData() {
    const button = document.getElementById('analyzeButton');
    const loading = document.getElementById('mapLoading');
    const loadingTitle = document.getElementById('loadingTitle');
    const loadingStatus = document.getElementById('loadingStatus');
    
    button.disabled = true;
    
    // Show loading overlay
    loading.style.display = 'flex';
    loading.classList.add('show');
    
    clearResults();
    
    const farmData = {
        farmerName: document.getElementById('farmerName').value,
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value),
        farmSize: parseFloat(document.getElementById('farmSize').value),
        primaryCrop: document.getElementById('primaryCrop').value
    };

    // Add Basel III parameter overrides if provided
    const pdInput = document.getElementById('probabilityOfDefaultInput').value;
    const lgdInput = document.getElementById('lossGivenDefaultInput').value;
    const eadInput = document.getElementById('exposureAtDefaultInput').value;
    
    if (pdInput && !isNaN(parseFloat(pdInput))) {
        farmData.probabilityOfDefaultOverride = parseFloat(pdInput) / 100; // Convert percentage to decimal
    }
    if (lgdInput && !isNaN(parseFloat(lgdInput))) {
        farmData.lossGivenDefaultOverride = parseFloat(lgdInput) / 100; // Convert percentage to decimal  
    }
    if (eadInput && !isNaN(parseFloat(eadInput))) {
        farmData.exposureAtDefaultOverride = parseFloat(eadInput);
    }

    try {
        // Reset and start workflow progression
        resetWorkflowStatus();
        updateWorkflowStatus(1, 'completed');
        updateWorkflowStatus(2, 'active');
        loadingTitle.textContent = 'Analyzing Satellite Data';
        loadingStatus.textContent = 'Processing NASA satellite data for credit analysis...';
        
        // Call our backend API which handles NASA data processing
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(farmData)
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Update workflow status progression
        updateWorkflowStatus(2, 'completed');
        updateWorkflowStatus(3, 'active');
        loadingStatus.textContent = 'Analyzing weather and risk factors...';
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateWorkflowStatus(3, 'completed');
        updateWorkflowStatus(4, 'active');
        loadingStatus.textContent = 'Calculating credit score...';
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateWorkflowStatus(4, 'completed');
        updateWorkflowStatus(5, 'active');
        loadingStatus.textContent = 'Generating recommendations...';
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateWorkflowStatus(5, 'completed');
        
        // Display results
        try {
            displayAnalysisResults(result);
        } catch (displayError) {
            console.error('Error in displayAnalysisResults:', displayError);
        }
        
        // Add bounding boxes to map
        try {
            addDataCoverageBounds(result);
        } catch (mapError) {
            console.error('Error in addDataCoverageBounds:', mapError);
        }
        
        // Hide loading overlay
        loading.style.display = 'none';
        loading.classList.remove('show');
        button.disabled = false;
        
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Error during satellite data analysis: ' + error.message);
        // Hide loading overlay
        loading.style.display = 'none';
        loading.classList.remove('show');
        button.disabled = false;
    }
}

function displayAnalysisResults(result) {
    currentSatelliteImages = result.browseImages || [];
    
    // Banner logic removed since banners were eliminated from UI
    
    // Display satellite images
    displaySatelliteImagesGrid(result.browseImages || []);
    
    // Show appropriate results panel based on success
    if (result.success && result.analysisResults) {
        // Show success results
        document.getElementById('successResults').classList.remove('hidden');
        document.getElementById('failureResults').classList.add('hidden');
        document.getElementById('defaultInfo').style.display = 'none';
        
        // Update data sources status panel
        document.getElementById('geeResult').textContent = result.analysisResults.geeDataAvailable ? 
            '✅ Connected' : '❌ No data';
        document.getElementById('gfsadResult').textContent = result.gfsadData.available ? 
            '✅ Connected' : '❌ No data';
        document.getElementById('modisResult').textContent = result.modisData.available ? 
            '✅ Connected' : '❌ No data';
        
        // Weather API status - show specific APIs
        const hasWeatherData = result.weatherData && result.weatherData.success;
        let weatherStatus;
        if (hasWeatherData) {
            const sources = [];
            if (result.weatherData.openMeteoData?.available) sources.push('Open-Meteo');
            if (result.weatherData.openWeatherData?.available) sources.push('OpenWeatherMap');
            if (result.weatherData.bmkgData?.available) sources.push('BMKG Indonesia');
            weatherStatus = sources.length > 0 ? `✅ ${sources.join(' + ')}` : '❌ No APIs';
        } else {
            weatherStatus = '❌ No APIs';
        }
        document.getElementById('weatherApiResult').textContent = weatherStatus;
        
        
        // Show vegetation section if GEE data is available
        if (result.analysisResults.geeDataAvailable && result.analysisResults.enhancedFeatures) {
            displayVegetationData(result.analysisResults.enhancedFeatures);
        }
        
        // Show weather analysis if weather data is available
        const hasWeatherAnalysis = result.weatherData && result.weatherData.success;
        if (hasWeatherAnalysis) {
            displayWeatherAnalysis(result.weatherData);
            // Also update the live weather panel in the control panel
            updateLiveWeatherPanel(result.weatherData);
        }
        
        // Show payment analysis if payment data is available  
        if (result.paymentData && result.paymentData.success) {
            displayPaymentAnalysis(result.paymentData);
        }
        
        // Show integrated insights if multiple data sources available
        if (result.analysisResults.dataSourceCount >= 3) {
            displayIntegratedInsights(result);
        }
        
        // Show data quality assessment if multiple sources available
        if (result.analysisResults.dataSourceCount >= 2) {
            displayDataQualityResults(result.analysisResults);
        }
        
        // Display credit score from banking analysis or fallback
        const creditAnalysis = result.analysisResults.creditAnalysis;
        if (creditAnalysis) {
            document.getElementById('scoreNumber').textContent = creditAnalysis.creditScore;
            document.getElementById('scoreStatus').textContent = `${creditAnalysis.riskLevel} - Banking Model`;
            
            // Populate banking analysis sections
            displayCreditAnalysis(creditAnalysis);
            displayKeyFactors(creditAnalysis.topFactors);
            displayImprovementSuggestions(creditAnalysis.improvementSuggestions);
            
        } else if (result.analysisResults.creditScore) {
            document.getElementById('scoreNumber').textContent = result.analysisResults.creditScore;
            document.getElementById('scoreStatus').textContent = `${result.analysisResults.eligibility.status} - ${result.analysisResults.confidence} Confidence`;
        } else {
            document.getElementById('scoreNumber').textContent = 'N/A';
            document.getElementById('scoreStatus').textContent = 'No Data Available';
        }
        
        // Show enhanced score breakdown if multiple data sources available
        displayScoreBreakdown(result);
        
    } else {
        // Show failure results
        document.getElementById('successResults').classList.add('hidden');
        document.getElementById('failureResults').classList.remove('hidden');
        document.getElementById('defaultInfo').style.display = 'none';
        
        // Update failure panel with error details
        document.getElementById('apiError').textContent = result.error || 'Analysis failed';
        
        const gfsadError = result.errors ? result.errors.find(e => e.includes('GFSAD')) : null;
        const modisError = result.errors ? result.errors.find(e => e.includes('MODIS')) : null;
        
        document.getElementById('gfsadError').textContent = gfsadError || 'Data retrieval failed';
        document.getElementById('modisError').textContent = modisError || 'Data retrieval failed';
        document.getElementById('recommendation').textContent = 'Check coordinates and try again';
    }
}

function displaySatelliteImagesGrid(browseImages) {
    const grid = document.getElementById('satelliteImagesGrid');
    
    if (browseImages.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; color: #999; font-size: 12px; grid-column: 1 / -1; padding: 20px;">
                No satellite imagery available for this location.
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    browseImages.forEach((image, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'satellite-image-item';
        imageItem.innerHTML = `
            <img src="/api/proxy-image?url=${encodeURIComponent(image.url)}" alt="${image.type}" class="satellite-image" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2280%22><rect width=%22120%22 height=%2280%22 fill=%22%23f44336%22/><text x=%2260%22 y=%2240%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2210%22 fill=%22white%22>Image Failed</text></svg>'">
            <div class="satellite-image-info">
                <div class="satellite-image-type">${image.type}</div>
                <div class="satellite-image-desc">${image.description}</div>
            </div>
        `;
        
        imageItem.addEventListener('click', () => {
            showImageModal(image);
        });
        
        grid.appendChild(imageItem);
    });
}

function showImageModal(image) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalDataset = document.getElementById('modalDataset');
    const modalResolution = document.getElementById('modalResolution');
    const modalSource = document.getElementById('modalSource');
    const modalStatus = document.getElementById('modalStatus');
    
    modalTitle.textContent = `🛰️ ${image.type} - Real NASA Data`;
    modalImage.src = `/api/proxy-image?url=${encodeURIComponent(image.url)}`;
    modalDataset.textContent = image.type;
    modalResolution.textContent = image.type === 'GFSAD30SEACE' ? '30 meters' : '250 meters';
    modalSource.textContent = image.source;
    modalStatus.textContent = 'Successfully Retrieved';
    
    modal.style.display = 'block';
    
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeImageModal();
        }
    };
}

function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
}

// Weather Analysis Display Functions
function displayWeatherAnalysis(weatherData) {
    const section = document.getElementById('weatherAnalysisSection');
    section.style.display = 'block';
    
    // Extract weather information from the response
    const openMeteoData = weatherData.openMeteoData;
    const openWeatherData = weatherData.openWeatherData;
    const analysisResults = weatherData.analysisResults;
    
    // Current temperature from OpenWeatherMap or Open-Meteo
    let currentTemp = '---';
    let currentHumidity = '---';
    if (openWeatherData && openWeatherData.current) {
        currentTemp = `${Math.round(openWeatherData.current.temp)}°C`;
        currentHumidity = `${openWeatherData.current.humidity}%`;
    } else if (openMeteoData && openMeteoData.current_weather) {
        currentTemp = `${Math.round(openMeteoData.current_weather.temperature)}°C`;
        currentHumidity = 'N/A (Open-Meteo)';
    }
    
    // Weekly precipitation
    let weeklyPrecip = '---';
    if (openWeatherData && openWeatherData.daily) {
        const weekTotal = openWeatherData.daily.slice(0, 7).reduce((sum, day) => sum + (day.rain?.['1h'] || 0), 0);
        weeklyPrecip = `${weekTotal.toFixed(1)}mm`;
    } else if (openMeteoData && openMeteoData.daily) {
        const weekTotal = openMeteoData.daily.precipitation_sum.slice(0, 7).reduce((sum, precip) => sum + precip, 0);
        weeklyPrecip = `${weekTotal.toFixed(1)}mm`;
    }
    
    // Show actual data sources
    let dataSources = [];
    if (openWeatherData) dataSources.push('OpenWeatherMap');
    if (openMeteoData) dataSources.push('Open-Meteo');
    const dataSourceText = dataSources.length > 0 ? dataSources.join(' + ') : 'No sources';
    
    // Update display
    document.getElementById('currentTemp').textContent = currentTemp;
    document.getElementById('currentHumidity').textContent = currentHumidity;
    document.getElementById('weeklyPrecip').textContent = weeklyPrecip;
    document.getElementById('weatherDataSources').textContent = dataSourceText;
}

// Payment Analysis Display Functions
function displayPaymentAnalysis(paymentData) {
    const section = document.getElementById('paymentReadinessSection');
    section.style.display = 'block';
    
    const analysisResults = paymentData.analysisResults || {};
    
    // Show what was actually analyzed (all simulated)
    const analysisText = 'OVO + GoPay + DANA + QRIS integration strategies';
    const dataSourcesText = `${paymentData.dataSources?.length || 0} simulated analyses`;
    
    // Update display
    document.getElementById('paymentDataAnalysis').textContent = analysisText;
    document.getElementById('paymentDataSources').textContent = dataSourcesText;
}

// Risk Assessment Display
function displayIntegratedInsights(result) {
    const section = document.getElementById('integratedInsightsSection');
    section.style.display = 'block';
    
    const analysisResults = result.analysisResults;
    const hasWeather = result.weatherData && result.weatherData.success;
    const hasSatellite = result.geeData || result.gfsadData?.available || result.modisData?.available;
    const hasPayment = result.paymentData && result.paymentData.success;
    const hasGov = result.governmentData && result.governmentData.success;
    
    const totalSources = analysisResults.dataSourceCount || 0;
    
    // Show factual analysis scope
    let analysisScope = [];
    if (hasSatellite) analysisScope.push('Satellite');
    if (hasWeather) analysisScope.push('Weather');
    if (hasGov) analysisScope.push('Government');
    if (hasPayment) analysisScope.push('Payment');
    
    const scopeText = analysisScope.length > 0 ? analysisScope.join(' + ') : 'Limited scope';
    
    // Integration status based on real APIs (payment/gov are placeholders)
    let integrationStatus = 'Limited integration';
    const realApis = (hasSatellite ? 1 : 0) + (hasWeather ? 1 : 0);
    if (realApis >= 2) {
        integrationStatus = 'Real satellite + weather APIs';
    } else if (realApis >= 1) {
        integrationStatus = 'Limited real data';
    } else {
        integrationStatus = 'No real APIs connected';
    }
    
    // Update display
    document.getElementById('totalDataSources').textContent = `${totalSources} sources`;
    document.getElementById('analysisScope').textContent = scopeText;
    document.getElementById('integrationStatus').textContent = integrationStatus;
}

// Live Weather Panel Update (Left Control Panel)
function updateLiveWeatherPanel(weatherData) {
    const panel = document.getElementById('currentWeatherPanel');
    panel.style.display = 'block';
    
    const openMeteoData = weatherData.openMeteoData;
    const openWeatherData = weatherData.openWeatherData;
    const analysisResults = weatherData.analysisResults;
    
    // Temperature - prefer OpenWeatherMap for more accuracy
    let currentTemp = '---';
    if (openWeatherData && openWeatherData.current) {
        currentTemp = `${Math.round(openWeatherData.current.temp)}°C`;
    } else if (openMeteoData && openMeteoData.current) {
        currentTemp = `${Math.round(openMeteoData.current.temperature_2m)}°C`;
    }
    
    // Humidity
    let humidity = '---';
    if (openWeatherData && openWeatherData.current) {
        humidity = `${openWeatherData.current.humidity}%`;
    } else if (openMeteoData && openMeteoData.current) {
        humidity = `${openMeteoData.current.relative_humidity_2m}%`;
    }
    
    // Conditions
    let conditions = '---';
    if (openWeatherData && openWeatherData.current && openWeatherData.current.weather) {
        conditions = openWeatherData.current.weather[0].main;
    } else if (openMeteoData && openMeteoData.current) {
        const weatherCode = openMeteoData.current.weather_code;
        conditions = weatherCode <= 1 ? 'Clear' : weatherCode <= 3 ? 'Partly Cloudy' : 'Cloudy';
    }
    
    // Risk assessment
    let riskLevel = '🟡 Monitor';
    if (analysisResults) {
        if (analysisResults.droughtMonitoring === 'low' && analysisResults.temperatureAnalysis) {
            riskLevel = '🟢 Low Risk';
        } else if (analysisResults.droughtMonitoring === 'high') {
            riskLevel = '🔴 High Risk';
        }
    }
    
    // Update display
    document.getElementById('liveTemp').textContent = currentTemp;
    document.getElementById('liveHumidity').textContent = humidity;
    document.getElementById('liveConditions').textContent = conditions;
    document.getElementById('liveRisk').textContent = riskLevel;
}

// Enhanced Score Breakdown Display
function displayScoreBreakdown(result) {
    const analysisResults = result.analysisResults;
    const weatherData = result.weatherData;
    
    // Only show breakdown if we have real data sources
    if (analysisResults.dataSourceCount >= 2) {
        const breakdown = document.getElementById('scoreBreakdown');
        breakdown.style.display = 'block';
        
        // Banking model calculates final score internally using all available data
        const totalScore = analysisResults.creditScore || 500;
        
        // Show that banking model uses all data sources internally
        document.getElementById('satelliteContrib').textContent = `${totalScore}`;
        document.getElementById('weatherContrib').textContent = weatherData && weatherData.success ? 
            `${weatherData.analysisResults?.scoreContribution || 0} points` : 'Not available';
        document.getElementById('paymentContrib').textContent = '(placeholder only)';
        document.getElementById('govContrib').textContent = '(placeholder only)';
    }
}

// Explainable AI Functions
function displayCreditAnalysis(creditAnalysis) {
    document.getElementById('creditScore').textContent = creditAnalysis.creditScore;
    document.getElementById('riskLevel').textContent = creditAnalysis.riskLevel;
    document.getElementById('maxLoanAmount').textContent = creditAnalysis.maxLoanAmount;
    document.getElementById('interestRate').textContent = creditAnalysis.interestRate;
    document.getElementById('approvalProbability').textContent = `${creditAnalysis.approvalProbability}%`;
    
    // Display Basel III Risk Parameters - PROMINENT DISPLAY
    if (creditAnalysis.baselIIIRiskParameters) {
        const basel = creditAnalysis.baselIIIRiskParameters;
        const overrides = basel.overridesUsed;
        
        // Main prominent display with override indicators
        const pdText = overrides.probabilityOfDefault ? `${basel.probabilityOfDefaultPercent} 🔧` : basel.probabilityOfDefaultPercent;
        const lgdText = overrides.lossGivenDefault ? `${basel.lossGivenDefaultPercent} 🔧` : basel.lossGivenDefaultPercent;
        const eclText = (overrides.probabilityOfDefault || overrides.lossGivenDefault || overrides.exposureAtDefault) ? 
            `${basel.expectedCreditLoss} 🔧` : basel.expectedCreditLoss;
        
        document.getElementById('expectedCreditLossMain').textContent = eclText;
        document.getElementById('probabilityOfDefaultMain').textContent = pdText;
        document.getElementById('lossGivenDefaultMain').textContent = lgdText;
        
        // Detailed section with override indicators
        const eadText = overrides.exposureAtDefault ? `${basel.exposureAtDefault} 🔧` : basel.exposureAtDefault;
        
        document.getElementById('probabilityOfDefault').textContent = pdText;
        document.getElementById('lossGivenDefault').textContent = lgdText;
        document.getElementById('exposureAtDefault').textContent = eadText;
        document.getElementById('expectedCreditLoss').textContent = eclText;
        document.getElementById('expectedCreditLossDetailed').textContent = 
            `${eclText} (${basel.expectedCreditLossPercent})`;
    }
    
    // Add AI status indicator
    const riskElement = document.getElementById('riskLevel');
    riskElement.innerHTML = `<span class="ai-status-indicator ai-active"></span>${creditAnalysis.riskLevel}`;
    
}


function displayKeyFactors(topFactors) {
    const factorsContainer = document.getElementById('topFactors');
    
    if (!topFactors || topFactors.length === 0) {
        factorsContainer.innerHTML = '<p style="color: #999; font-size: 12px;">No factor analysis available</p>';
        return;
    }
    
    let factorsHtml = '';
    topFactors.forEach((factor, index) => {
        const isPositive = factor.isPositive;
        const impactDirection = isPositive ? 'Positive' : 'Negative';
        const factorClass = isPositive ? 'factor-positive' : 'factor-negative';
        const impactIcon = isPositive ? '↗️' : '↘️';
        
        factorsHtml += `
            <div class="factor-item ${factorClass} factor-connection-line" data-factor-index="${index}">
                <div class="factor-name">${impactIcon} ${factor.name}</div>
                <div class="factor-impact">${impactDirection} Impact: ${Math.abs(factor.impact).toFixed(3)} | Input Value: ${factor.value.toFixed(3)}</div>
                <div class="factor-explanation">${factor.explanation}</div>
            </div>
        `;
    });
    
    factorsContainer.innerHTML = factorsHtml;
    
    // Add visual connections between inputs and outputs
    highlightConnectedFeatures(topFactors);
}

function highlightConnectedFeatures(topFactors) {
    // Reset any previous highlights
    document.querySelectorAll('.input-feature-item').forEach(item => {
        item.classList.remove('highlighted-input');
    });
    
    // Highlight input features that have corresponding explanations
    topFactors.forEach((factor, index) => {
        // Map factor names back to technical feature names for highlighting
        const factorToFeatureMap = {
            'Farm Size': 'farm_size_hectares',
            'Vegetation Health': 'ndvi_mean',
            'Vegetation Quality': 'evi_mean',
            'Soil Moisture': 'ndmi_mean',
            'Digital Engagement': 'phone_usage_score',
            'Payment History': 'payment_regularity',
            'Location Stability': 'location_stability'
        };
        
        const featureKey = factorToFeatureMap[factor.name];
        if (featureKey) {
            const inputElement = document.querySelector(`[data-feature="${featureKey}"]`);
            if (inputElement) {
                inputElement.classList.add('highlighted-input');
                inputElement.style.animationDelay = `${index * 0.2}s`;
            }
        }
    });
}

function displayImprovementSuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('improvementSuggestions');
    
    if (!suggestions || suggestions.length === 0) {
        suggestionsContainer.innerHTML = '<p style="color: #999; font-size: 12px;">No suggestions available</p>';
        return;
    }
    
    let suggestionsHtml = '';
    suggestions.forEach((suggestion, index) => {
        suggestionsHtml += `
            <div class="improvement-item">
                ${index + 1}. ${suggestion}
            </div>
        `;
    });
    
    suggestionsContainer.innerHTML = suggestionsHtml;
}

function displayVegetationData(enhancedFeatures) {
    const vegetationSection = document.getElementById('vegetationSection');
    
    if (enhancedFeatures && enhancedFeatures.vegetationIndices) {
        const indices = enhancedFeatures.vegetationIndices;
        
        document.getElementById('ndviValue').textContent = indices.ndvi ? 
            `${indices.ndvi.toFixed(3)} (${indices.resolution})` : 'N/A';
        document.getElementById('eviValue').textContent = indices.evi ? 
            indices.evi.toFixed(3) : 'N/A';
        document.getElementById('saviValue').textContent = indices.savi ? 
            indices.savi.toFixed(3) : 'N/A';
        document.getElementById('ndmiValue').textContent = indices.ndmi ? 
            indices.ndmi.toFixed(3) : 'N/A';
        
        vegetationSection.style.display = 'block';
    }
}

function displayDataQualityResults(analysisResults) {
    const crossValidationSection = document.getElementById('crossValidationSection');
    const validationContainer = document.getElementById('validationResults');
    
    let validationHtml = '';
    
    // Show data source count and analysis type
    const dataSourceCount = analysisResults.dataSourceCount || 0;
    const analysisType = analysisResults.fusionLevel || 'Standard Analysis';
    
    validationHtml += `
        <div class="data-row">
            <span class="data-label">Data Sources Active:</span>
            <span class="data-value">${dataSourceCount} sources</span>
        </div>
        <div class="data-row">
            <span class="data-label">Analysis Type:</span>
            <span class="data-value">${analysisType}</span>
        </div>
    `;
    
    // Show confidence explanation if available
    if (analysisResults.confidenceExplanation) {
        validationHtml += `
            <div style="margin-top: 10px; padding: 8px; background: #f0f8ff; border-radius: 4px; font-size: 12px; color: #666;">
                <strong>Confidence Factors:</strong><br>
                ${analysisResults.confidenceExplanation}
            </div>
        `;
    }
    
    // Show resolution comparison
    if (analysisResults.resolutionLevel) {
        validationHtml += `
            <div class="data-row">
                <span class="data-label">Resolution Level:</span>
                <span class="data-value">${analysisResults.resolutionLevel}</span>
            </div>
        `;
    }
    
    validationContainer.innerHTML = validationHtml;
    crossValidationSection.style.display = 'block';
}

function clearResults() {
    document.getElementById('successResults').classList.add('hidden');
    document.getElementById('failureResults').classList.add('hidden');
    document.getElementById('defaultInfo').style.display = 'block';
    
    // Reset sections
    document.getElementById('mlInputsSection').style.display = 'none';
    document.getElementById('vegetationSection').style.display = 'none';
    document.getElementById('crossValidationSection').style.display = 'none';
    
    // Clear map data and reset grid
    coverageRectangles.forEach(rect => map.removeLayer(rect));
    coverageRectangles = [];
    currentSatelliteImages = [];
    document.getElementById('satelliteImagesGrid').innerHTML = `
        <div style="text-align: center; color: #999; font-size: 12px; grid-column: 1 / -1; padding: 20px; background: linear-gradient(135deg, #e8f5e8, #e3f2fd); border-radius: 8px; border: 2px dashed #4CAF50;">
            <div style="font-size: 16px; margin-bottom: 8px;">🛰️🌦️🤖</div>
            <strong>Advanced Analytics Ready</strong><br>
            Click "Analyze Credit Score" to view satellite imagery and weather data analysis
        </div>
    `;
}

function showError(message) {
    alert('Error: ' + message);
}

// Initialize when page loads
window.onload = function() {
    initializeMap();
    loadDemoLocation('siti');
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeImageModal();
        }
    });
};

// Workflow status management for bank staff
function updateWorkflowStatus(step, status) {
    const statusElement = document.getElementById(`workflowStatus${step}`);
    if (statusElement) {
        statusElement.classList.remove('active', 'completed');
        if (status === 'active') {
            statusElement.classList.add('active');
        } else if (status === 'completed') {
            statusElement.classList.add('completed');
            statusElement.textContent = '✓';
        }
    }
}

// Reset workflow status
function resetWorkflowStatus() {
    for (let i = 1; i <= 5; i++) {
        const statusElement = document.getElementById(`workflowStatus${i}`);
        if (statusElement) {
            statusElement.classList.remove('active', 'completed');
            statusElement.textContent = i.toString();
        }
    }
}

// Mobile navigation toggle removed - mobile view deprecated

// Initialize presentation mode
function initializePresentationMode() {
    // Add keyboard shortcuts for presentation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F11') {
            e.preventDefault();
            document.documentElement.requestFullscreen();
        }
        if (e.key === 'Escape') {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializePresentationMode();
});
