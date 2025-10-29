import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatTime } from '../utils'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

function Trends() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ artists: [], tracks: [] })
  const [selectedItem, setSelectedItem] = useState(null)
  const [trendsData, setTrendsData] = useState(null)
  const [granularity, setGranularity] = useState('year')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [yAxisMetric, setYAxisMetric] = useState('plays') // 'plays' or 'duration'
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const searchTimeoutRef = useRef(null)
  const chartRef = useRef(null)

  // Format period for display (e.g., "2023-11" -> "Nov 2023")
  const formatPeriod = useCallback((period, granularity) => {
    if (!period) return period

    if (granularity === 'month') {
      // Format: "2023-11" -> "Nov 2023"
      const [year, month] = period.split('-')
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthIndex = parseInt(month, 10) - 1
      return `${monthNames[monthIndex]} ${year}`
    } else if (granularity === 'week') {
      // Format: "2023-W45" -> "Week 45 2023"
      const match = period.match(/(\d{4})-W(\d+)/)
      if (match) {
        return `Week ${match[2]} ${match[1]}`
      }
    } else if (granularity === 'day') {
      // Format: "2023-11-15" -> "14 Mar 2021"
      const date = new Date(period)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`
    }
    
    // For year or unknown granularity, return as-is
    return period
  }, [])

  // Check if we received a selected item from navigation
  useEffect(() => {
    if (location.state?.selectedItem) {
      setSelectedItem(location.state.selectedItem)
      // Clear the navigation state so refresh doesn't reapply it
      window.history.replaceState({}, document.title)
    }
  }, [location])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ artists: [], tracks: [] })
      return
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/search?query=${encodeURIComponent(searchQuery)}`
        )
        if (!response.ok) throw new Error('Search failed')
        const data = await response.json()
        setSearchResults(data)
      } catch (err) {
        console.error('Search error:', err)
        setError('Failed to search')
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Fetch trends when item is selected or filters change
  useEffect(() => {
    if (!selectedItem) {
      setTrendsData(null)
      return
    }

    fetchTrends()
  }, [selectedItem, granularity, startDate, endDate])

  const fetchTrends = useCallback(async () => {
    if (!selectedItem) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (selectedItem.type === 'artist') {
        params.append('artist_name', selectedItem.name)
      } else {
        params.append('track_name', selectedItem.trackName)
        params.append('artist_name', selectedItem.artistName)
      }
      
      params.append('granularity', granularity)
      
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const response = await fetch(`${API_BASE_URL}/api/trends?${params}`)
      if (!response.ok) throw new Error('Failed to fetch trends')
      
      const data = await response.json()
      setTrendsData(data)
    } catch (err) {
      console.error('Trends error:', err)
      setError('Failed to load trends data')
    } finally {
      setLoading(false)
    }
  }, [selectedItem, granularity, startDate, endDate])

  const handleSelectItem = useCallback((item) => {
    setSelectedItem(item)
    setSearchQuery('')
    setSearchResults({ artists: [], tracks: [] })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItem(null)
    setTrendsData(null)
    setStartDate('')
    setEndDate('')
    setYAxisMetric('plays')
    setHoveredIndex(null)
  }, [])

  const handleMouseEnter = useCallback((index, event) => {
    setHoveredIndex(index)
    if (chartRef.current && event.currentTarget) {
      const chartRect = chartRef.current.getBoundingClientRect()
      const barRect = event.currentTarget.getBoundingClientRect()
      
      // Calculate position relative to the chart container, accounting for scroll
      const scrollLeft = chartRef.current.scrollLeft || 0
      
      // Position tooltip at the top of the actual bar element
      setTooltipPosition({
        x: barRect.left - chartRect.left + barRect.width / 2 + scrollLeft,
        y: barRect.top - chartRect.top
      })
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null)
  }, [])

  const handleBarClick = useCallback((period) => {
    if (granularity === 'year') {
      // Navigate to dashboard with year filter
      navigate('/', { 
        state: { 
          selectedYears: [period]
        }
      })
    } else if (granularity === 'month') {
      // Parse year and month from period (format: "2023-11")
      const [year, month] = period.split('-')
      navigate('/', { 
        state: { 
          selectedYears: [year],
          selectedMonths: [month]
        }
      })
    } else if (granularity === 'day') {
      // Navigate to calendar with day selected (format: "2023-11-15")
      navigate(`/day/${period}`)
    }
  }, [granularity, navigate])

  // Hide tooltip on scroll
  useEffect(() => {
    const chartElement = chartRef.current
    if (!chartElement) return

    const handleScroll = () => {
      setHoveredIndex(null)
    }

    chartElement.addEventListener('scroll', handleScroll)
    return () => {
      chartElement.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Fill in missing periods with zero data
  const fillMissingPeriods = useCallback((data, granularity) => {
    if (!data || data.length === 0) return []

    // Safety limit: if data has too many items already, don't try to fill
    const MAX_FILLED_ITEMS = 1000
    if (data.length > MAX_FILLED_ITEMS) {
      console.warn(`Data length (${data.length}) exceeds safety limit. Skipping fill.`)
      return data
    }

    // Create a map of existing data for quick lookup
    const dataMap = new Map()
    data.forEach(item => {
      dataMap.set(item.period, item)
    })

    const filledData = []
    
    if (granularity === 'month') {
      // Parse first and last periods
      const firstPeriod = data[0].period
      const lastPeriod = data[data.length - 1].period
      
      const [startYear, startMonth] = firstPeriod.split('-').map(Number)
      const [endYear, endMonth] = lastPeriod.split('-').map(Number)
      
      // Validate parsed values
      if (isNaN(startYear) || isNaN(startMonth) || isNaN(endYear) || isNaN(endMonth)) {
        console.error('Invalid date format in month data')
        return data
      }
      
      // Calculate total months to prevent infinite loops
      const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1
      if (totalMonths > MAX_FILLED_ITEMS || totalMonths < 0) {
        console.warn(`Month range too large (${totalMonths} months). Skipping fill.`)
        return data
      }
      
      let currentYear = startYear
      let currentMonth = startMonth
      let iterations = 0
      
      while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
        // Safety check to prevent infinite loops
        if (iterations++ > MAX_FILLED_ITEMS) {
          console.error('Infinite loop detected in fillMissingPeriods')
          break
        }
        
        const period = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
        
        if (dataMap.has(period)) {
          filledData.push(dataMap.get(period))
        } else {
          filledData.push({
            period: period,
            play_count: 0,
            total_ms: 0
          })
        }
        
        currentMonth++
        if (currentMonth > 12) {
          currentMonth = 1
          currentYear++
        }
      }
    } else if (granularity === 'year') {
      // Parse first and last years
      const startYear = parseInt(data[0].period)
      const endYear = parseInt(data[data.length - 1].period)
      
      for (let year = startYear; year <= endYear; year++) {
        const period = String(year)
        
        if (dataMap.has(period)) {
          filledData.push(dataMap.get(period))
        } else {
          filledData.push({
            period: period,
            play_count: 0,
            total_ms: 0
          })
        }
      }
    } else if (granularity === 'day') {
      // Parse first and last dates
      const startDate = new Date(data[0].period)
      const endDate = new Date(data[data.length - 1].period)
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid date format in day data')
        return data
      }
      
      // Calculate total days to prevent infinite loops
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
      if (totalDays > MAX_FILLED_ITEMS || totalDays < 0) {
        console.warn(`Day range too large (${totalDays} days). Skipping fill.`)
        return data
      }
      
      let currentDate = new Date(startDate)
      let iterations = 0
      
      while (currentDate <= endDate) {
        // Safety check to prevent infinite loops
        if (iterations++ > MAX_FILLED_ITEMS) {
          console.error('Infinite loop detected in fillMissingPeriods')
          break
        }
        
        const period = currentDate.toISOString().split('T')[0]
        
        if (dataMap.has(period)) {
          filledData.push(dataMap.get(period))
        } else {
          filledData.push({
            period: period,
            play_count: 0,
            total_ms: 0
          })
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
    } else if (granularity === 'week') {
      // For weeks, just use the existing data as-is
      // (filling weeks is complex due to week number variations)
      return data
    } else {
      return data
    }
    
    return filledData
  }, [])

  // Calculate chart dimensions and data
  const getChartData = useCallback(() => {
    if (!trendsData || !trendsData.data.length) return null

    // Fill in missing periods
    const filledData = fillMissingPeriods(trendsData.data, granularity)
    
    const maxPlayCount = Math.max(...filledData.map(d => d.play_count), 1) // Ensure at least 1 for scale
    const maxDuration = Math.max(...filledData.map(d => d.total_ms), 1)

    return { data: filledData, maxPlayCount, maxDuration }
  }, [trendsData, granularity, fillMissingPeriods])

  // Get the appropriate y-axis value and max based on selected metric
  const getYValue = useCallback((item) => {
    return yAxisMetric === 'plays' ? item.play_count : item.total_ms
  }, [yAxisMetric])

  const getYMax = useCallback((chartData) => {
    return yAxisMetric === 'plays' ? chartData.maxPlayCount : chartData.maxDuration
  }, [yAxisMetric])

  const getYAxisLabel = useCallback(() => {
    return yAxisMetric === 'plays' ? 'Number of Plays' : 'Listening Duration (Minutes)'
  }, [yAxisMetric])

  const getXAxisLabel = useCallback(() => {
    const labels = {
      day: 'Date',
      week: 'Week',
      month: 'Month',
      year: 'Year'
    }
    return labels[granularity] || 'Time Period'
  }, [granularity])

  // Convert milliseconds to minutes for display
  const msToMinutes = useCallback((ms) => {
    return Math.round(ms / 60000)
  }, [])

  const chartData = getChartData()

  return (
    <div className="trends-container">
      <div className="trends-header">
        <h2>Search & Trends</h2>
        <p>Search for an artist or song to see your listening trends over time</p>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search for an artist or song..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!!selectedItem}
          />
          {selectedItem && (
            <button className="clear-search-btn" onClick={clearSelection}>
              Clear Selection
            </button>
          )}
        </div>

        {/* Search Results */}
        {searchResults.artists.length > 0 || searchResults.tracks.length > 0 ? (
          <div className="search-results">
            {searchResults.artists.length > 0 && (
              <div className="results-section">
                <h3>Artists</h3>
                {searchResults.artists.map((artist, idx) => (
                  <div
                    key={`artist-${idx}`}
                    className="search-result-item"
                    onClick={() => handleSelectItem(artist)}
                  >
                    <div className="result-info">
                      <span className="result-name">{artist.name}</span>
                      <span className="result-meta">{artist.play_count} plays</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults.tracks.length > 0 && (
              <div className="results-section">
                <h3>Tracks</h3>
                {searchResults.tracks.map((track, idx) => (
                  <div
                    key={`track-${idx}`}
                    className="search-result-item"
                    onClick={() => handleSelectItem(track)}
                  >
                    <div className="result-info">
                      <span className="result-name">{track.trackName}</span>
                      <span className="result-artist">by {track.artistName}</span>
                      <span className="result-meta">{track.play_count} plays</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : searchQuery.trim() && !loading ? (
          <div className="no-results">No results found</div>
        ) : null}
      </div>

      {/* Selected Item & Trends */}
      {selectedItem && (
        <div className="trends-content">
          <div className="selected-item-header">
            <h3>
              {selectedItem.type === 'artist' 
                ? selectedItem.name 
                : `${selectedItem.trackName} - ${selectedItem.artistName}`
              }
            </h3>
          </div>

          {/* Filters */}
          <div className="trends-filters">
            <div className="filter-group">
              <label>Y-Axis:</label>
              <div className="chart-type-toggle">
                <button
                  className={`toggle-btn ${yAxisMetric === 'plays' ? 'active' : ''}`}
                  onClick={() => setYAxisMetric('plays')}
                  aria-label="Show play count"
                >
                  Plays
                </button>
                <button
                  className={`toggle-btn ${yAxisMetric === 'duration' ? 'active' : ''}`}
                  onClick={() => setYAxisMetric('duration')}
                  aria-label="Show duration"
                >
                  Duration
                </button>
              </div>
            </div>

            <div className="filter-group">
              <label>Granularity:</label>
              <select value={granularity} onChange={(e) => setGranularity(e.target.value)}>
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Chart */}
          {loading && <div className="loading">Loading trends...</div>}
          
          {error && <div className="error-message">{error}</div>}
          
          {chartData && chartData.data.length > 0 && (
            <div className="chart-container">
              <div className="chart-stats">
                <div className="stat-box">
                  <span className="stat-label">Total Plays</span>
                  <span className="stat-value">
                    {chartData.data.reduce((sum, d) => sum + d.play_count, 0).toLocaleString()}
                  </span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Total Time</span>
                  <span className="stat-value">
                    {formatTime(chartData.data.reduce((sum, d) => sum + d.total_ms, 0))}
                  </span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Time Range</span>
                  <span className="stat-value">
                    {chartData.data.length} {granularity}s
                  </span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Peak Period</span>
                  <span className="stat-value">
                    {formatPeriod(
                      chartData.data.reduce((max, d) => d.play_count > max.play_count ? d : max, chartData.data[0]).period,
                      granularity
                    )}
                  </span>
                </div>
              </div>

              <div className="chart" ref={chartRef}>
                {/* Hover tooltip - positioned absolutely within chart */}
                {hoveredIndex !== null && chartData.data[hoveredIndex] && (
                  <div 
                    className="chart-tooltip-popup"
                    style={{
                      left: `${tooltipPosition.x}px`,
                      top: `${tooltipPosition.y}px`,
                    }}
                  >
                    <div className="tooltip-date">{formatPeriod(chartData.data[hoveredIndex].period, granularity)}</div>
                    <div className="tooltip-plays">{chartData.data[hoveredIndex].play_count} plays</div>
                    <div className="tooltip-duration">{formatTime(chartData.data[hoveredIndex].total_ms)}</div>
                  </div>
                )}

                {/* Y-axis label */}
                <div className="chart-y-label">{getYAxisLabel()}</div>

                <div className="chart-y-axis">
                  <span>{yAxisMetric === 'plays' ? getYMax(chartData) : msToMinutes(getYMax(chartData))}</span>
                  <span>{yAxisMetric === 'plays' ? Math.round(getYMax(chartData) / 2) : msToMinutes(Math.round(getYMax(chartData) / 2))}</span>
                  <span>0</span>
                </div>
                <div className="chart-content">
                  {/* Bar Chart */}
                  <div className="chart-bars">
                    {chartData.data.map((item, idx) => {
                      const yValue = getYValue(item)
                      const yMax = getYMax(chartData)
                      const heightPercent = (yValue / yMax) * 100
                      return (
                        <div 
                          key={idx} 
                          className="bar-wrapper"
                        >
                          <div 
                            className={`bar ${hoveredIndex === idx ? 'hovered' : ''}`}
                            style={{ 
                              height: `${heightPercent}%`,
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => handleMouseEnter(idx, e)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => handleBarClick(item.period)}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleBarClick(item.period)
                              }
                            }}
                          >
                            <span className="bar-value">
                              {yAxisMetric === 'plays' ? yValue : msToMinutes(yValue)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="chart-x-axis">
                    {chartData.data.map((item, idx) => {
                      let showLabel = false
                      
                      if (granularity === 'month') {
                        // Show only January, April, July, October
                        const month = parseInt(item.period.split('-')[1], 10)
                        showLabel = [1, 4, 7, 10].includes(month)
                      } else if (granularity === 'day') {
                        // Show only 1st and 14th of each month
                        const date = new Date(item.period)
                        const day = date.getDate()
                        showLabel = [1, 14].includes(day)
                      } else {
                        // For year granularity, show all labels if <= 12, otherwise show every nth
                        showLabel = chartData.data.length <= 12 || idx % Math.ceil(chartData.data.length / 12) === 0
                      }
                      
                      return (
                        <span key={idx} className={showLabel ? '' : 'hidden-label'}>
                          {formatPeriod(item.period, granularity)}
                        </span>
                      )
                    })}
                  </div>
                  {/* X-axis label */}
                  <div className="chart-x-label">{getXAxisLabel()}</div>
                </div>
              </div>
            </div>
          )}

          {chartData && chartData.data.length === 0 && !loading && (
            <div className="no-data">No listening data found for the selected filters</div>
          )}
        </div>
      )}

      {!selectedItem && !searchQuery && (
        <div className="trends-placeholder">
          <p>Start by searching for an artist or song above</p>
        </div>
      )}
    </div>
  )
}

export default Trends
