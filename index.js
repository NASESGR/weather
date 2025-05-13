document.addEventListener('DOMContentLoaded', function() {
    const API_KEY = '27ae4c0f917951668a9200f29e769776';
    let currentCity = 'SHREK';
    let currentCoords = null;
    
 
    const elements = {
        citySearch: document.getElementById('city-search'),
        searchBtn: document.getElementById('search-btn'),
        errorMessage: document.getElementById('error-message'),
        errorText: document.getElementById('error-text'),
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        currentCity: document.getElementById('current-city'),
        currentTemp: document.getElementById('current-temp'),
        currentFeelsLike: document.getElementById('current-feels-like'),
        currentDescription: document.getElementById('current-description'),
        currentIcon: document.getElementById('current-icon'),
        humidity: document.getElementById('humidity'),
        wind: document.getElementById('wind'),
        pressure: document.getElementById('pressure'),
        visibility: document.getElementById('visibility'),
        sunrise: document.getElementById('sunrise'),
        sunset: document.getElementById('sunset'),
        dailyForecast: document.getElementById('daily-forecast'),
        forecastDetails: document.getElementById('forecast-details')
    };

 
    initApp();

    async function initApp() {
        setLoadingState(true);
        elements.citySearch.value = currentCity;
        
        try {
            
            const geoData = await fetchGeoData(currentCity);
            if (geoData && geoData.length > 0) {
                currentCoords = { lat: geoData[0].lat, lon: geoData[0].lon };
                await Promise.all([
                    fetchCurrentWeather(currentCoords),
                    fetchPopularCitiesWeather()
                ]);
            } else {
                throw new Error('Could not get location data');
            }
        } catch (error) {
            showError(error.message);
        } finally {
            setLoadingState(false);
        }
        
        setupEventListeners();
    }

    function setupEventListeners() {
        elements.searchBtn.addEventListener('click', handleSearch);
        elements.citySearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleSearch();
        });
        
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                elements.tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const tabName = this.getAttribute('data-tab');
                elements.tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`${tabName}-tab`).classList.add('active');
                
                if (tabName === 'forecast' && currentCoords) {
                    fetch5DayForecast(currentCoords);
                }
            });
        });
        
        document.querySelectorAll('.city-card').forEach(card => {
            card.addEventListener('click', async function() {
                const city = this.getAttribute('data-city');
                currentCity = city;
                elements.citySearch.value = city;
                setLoadingState(true);
                
                try {
                    const geoData = await fetchGeoData(city);
                    if (geoData && geoData.length > 0) {
                        currentCoords = { lat: geoData[0].lat, lon: geoData[0].lon };
                        await fetchCurrentWeather(currentCoords);
                    } else {
                        throw new Error('Could not get location data');
                    }
                } catch (error) {
                    showError(error.message);
                } finally {
                    setLoadingState(false);
                }
                
                if (!document.querySelector('.tab-btn[data-tab="today"]').classList.contains('active')) {
                    document.querySelector('.tab-btn[data-tab="today"]').click();
                }
            });
        });
    }

    async function handleSearch() {
        const city = elements.citySearch.value.trim();
        if (city) {
            currentCity = city;
            setLoadingState(true);
            
            try {
                const geoData = await fetchGeoData(city);
                if (geoData && geoData.length > 0) {
                    currentCoords = { lat: geoData[0].lat, lon: geoData[0].lon };
                    await fetchCurrentWeather(currentCoords);
                } else {
                    throw new Error('Location not found');
                }
            } catch (error) {
                showError(error.message);
            } finally {
                setLoadingState(false);
            }
        }
    }
    
    async function fetchGeoData(city) {
        try {
            const url = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
            const response = await fetchWithTimeout(url);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            
            if (!data || data.length === 0) {
                throw new Error('Location not found');
            }
            
            return data;
        } catch (error) {
            throw error;
        }
    }
    
    async function fetchCurrentWeather(coords) {
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${API_KEY}`;
            const response = await fetchWithTimeout(url);
            
            if (!response.ok) {
                throw new Error('Weather data not available');
            }
            
            const data = await response.json();
            displayCurrentWeather(data);
        } catch (error) {
            throw error;
        }
    }
    
    async function fetch5DayForecast(coords) {
        try {
            const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${API_KEY}`;
            const response = await fetchWithTimeout(url);
            
            if (!response.ok) {
                throw new Error('Forecast data not available');
            }
            
            const data = await response.json();
            display5DayForecast(data);
        } catch (error) {
            elements.dailyForecast.innerHTML = `<p>Could not load forecast data: ${error.message}</p>`;
        }
    }
    
    async function fetchPopularCitiesWeather() {
        const cities = ['London', 'New York', 'Tokyo', 'Paris'];
        const requests = cities.map(city => 
            fetchGeoData(city)
                .then(geoData => {
                    if (geoData && geoData.length > 0) {
                        return fetchCurrentWeatherForCity(city, geoData[0]);
                    }
                    return null;
                })
                .catch(error => {
                    console.error(`Error fetching data for ${city}:`, error);
                    return null;
                })
        );
        
        await Promise.all(requests);
    }
    
    async function fetchCurrentWeatherForCity(city, geoData) {
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${geoData.lat}&lon=${geoData.lon}&units=metric&appid=${API_KEY}`;
            const response = await fetchWithTimeout(url);
            
            if (!response.ok) {
                return null;
            }
            
            const data = await response.json();
            updateCityCard(city, data);
            return data;
        } catch (error) {
            console.error(`Error fetching weather for ${city}:`, error);
            return null;
        }
    }
    
    function displayCurrentWeather(data) {
        elements.currentCity.textContent = data.name;
        elements.currentTemp.textContent = `${Math.round(data.main.temp)}°C`;
        elements.currentFeelsLike.textContent = `Feels like: ${Math.round(data.main.feels_like)}°C`;
        elements.currentDescription.textContent = data.weather[0].description;
        
        const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        elements.currentIcon.src = iconUrl;
        elements.currentIcon.alt = data.weather[0].main;
        
        elements.humidity.textContent = `${data.main.humidity}%`;
        elements.wind.textContent = `${data.wind.speed} m/s ${getWindDirection(data.wind.deg)}`;
        elements.pressure.textContent = `${data.main.pressure} hPa`;
        elements.visibility.textContent = `${data.visibility / 1000} km`;
        
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        elements.sunrise.textContent = sunrise.toLocaleTimeString();
        elements.sunset.textContent = sunset.toLocaleTimeString();
        
        hideError();
    }
    
    function display5DayForecast(data) {
        elements.dailyForecast.innerHTML = '';
        
        
        const dailyData = {};
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateStr = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = [];
            }
            dailyData[dateStr].push(item);
        });
        
        
        const next5Days = Object.entries(dailyData).slice(0, 5);
        
        next5Days.forEach(([dateStr, dayData], index) => {
            const dayCard = document.createElement('div');
            dayCard.className = `day-card ${index === 0 ? 'active' : ''}`;
            dayCard.setAttribute('data-date', dateStr);
            
            
            const avgTemp = dayData.reduce((sum, item) => sum + item.main.temp, 0) / dayData.length;
            
            dayCard.innerHTML = `
                <div>${dateStr.split(',')[0]}</div>
                <div>${dateStr.split(',')[1]}</div>
                <img src="https://openweathermap.org/img/wn/${dayData[0].weather[0].icon}.png" alt="${dayData[0].weather[0].main}">
                <div>${Math.round(avgTemp)}°C</div>
                <div>${dayData[0].weather[0].description}</div>
            `;
            
            dayCard.addEventListener('click', function() {
                document.querySelectorAll('.day-card').forEach(card => card.classList.remove('active'));
                this.classList.add('active');
                displayDayDetails(dayData[0]);
            });
            
            elements.dailyForecast.appendChild(dayCard);
        });
        
        
        if (next5Days.length > 0) {
            displayDayDetails(next5Days[0][1][0]);
        }
    }
    
    function displayDayDetails(dayData) {
        const date = new Date(dayData.dt * 1000);
        elements.forecastDetails.innerHTML = `
            <h3>Detailed Weather for ${date.toLocaleDateString()}</h3>
            <div class="detail-item">
                <span>Temperature:</span>
                <span>${Math.round(dayData.main.temp)}°C</span>
            </div>
            <div class="detail-item">
                <span>Feels Like:</span>
                <span>${Math.round(dayData.main.feels_like)}°C</span>
            </div>
            <div class="detail-item">
                <span>Humidity:</span>
                <span>${dayData.main.humidity}%</span>
            </div>
            <div class="detail-item">
                <span>Pressure:</span>
                <span>${dayData.main.pressure} hPa</span>
            </div>
            <div class="detail-item">
                <span>Wind Speed:</span>
                <span>${dayData.wind.speed} m/s</span>
            </div>
            <div class="detail-item">
                <span>Wind Direction:</span>
                <span>${getWindDirection(dayData.wind.deg)}</span>
            </div>
            <div class="detail-item">
                <span>Cloudiness:</span>
                <span>${dayData.clouds.all}%</span>
            </div>
            <div class="detail-item">
                <span>Weather:</span>
                <span>${dayData.weather[0].description}</span>
            </div>
        `;
    }
    
    function updateCityCard(city, weatherData) {
        const cityCard = document.querySelector(`.city-card[data-city="${city}"]`);
        if (cityCard) {
            const tempElement = cityCard.querySelector('.city-temp');
            const iconElement = cityCard.querySelector('.city-icon');
            
            tempElement.textContent = `${Math.round(weatherData.main.temp)}°C`;
            iconElement.src = `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}.png`;
            iconElement.alt = weatherData.weather[0].description;
        }
    }
    
    function showError(message) {
        elements.errorText.textContent = `${currentCity} could not be found. ${message}`;
        elements.errorMessage.style.display = 'block';
        clearWeatherData();
    }
    
    function hideError() {
        elements.errorMessage.style.display = 'none';
    }
    
    function clearWeatherData() {
        elements.currentCity.textContent = '';
        elements.currentTemp.textContent = '';
        elements.currentFeelsLike.textContent = '';
        elements.currentDescription.textContent = '';
        elements.currentIcon.src = '';
        elements.humidity.textContent = '';
        elements.wind.textContent = '';
        elements.pressure.textContent = '';
        elements.visibility.textContent = '';
        elements.sunrise.textContent = '';
        elements.sunset.textContent = '';
        elements.dailyForecast.innerHTML = '';
        elements.forecastDetails.innerHTML = '';
    }
    
    function setLoadingState(isLoading) {
        const mainContent = document.querySelector('main');
        if (isLoading) {
            mainContent.classList.add('loading');
        } else {
            mainContent.classList.remove('loading');
        }
    }
    
    function fetchWithTimeout(url, timeout = 8000) {
        return Promise.race([
            fetch(url),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), timeout)
            )]);
    }
    
    function getWindDirection(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }
});

console.log('Weather App Loaded check console for errors');
console.log("LELELELLELLE это работает");

