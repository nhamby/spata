import { useState, useEffect, useCallback, useRef } from 'react'
import { formatTime } from '../utils'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

function Trends() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ artists: [], tracks: [] })
  const [selectedItem, setSelectedItem] = useState(null)
  const [trendsData, setTrendsData] = useState(null)
  const [granularity, setGranularity] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [chartType, setChartType] = useState('bar') // 'bar' or 'density'
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const searchTimeoutRef = useRef(null)
  const chartRef = useRef(null)

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
    setChartType('bar')
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

  // Calculate chart dimensions and data
  const getChartData = useCallback(() => {
    if (!trendsData || !trendsData.data.length) return null

    const data = trendsData.data
    const maxPlayCount = Math.max(...data.map(d => d.play_count))
    const maxDuration = Math.max(...data.map(d => d.total_ms))

    return { data, maxPlayCount, maxDuration }
  }, [trendsData])

  const chartData = getChartData()

  return (
    <div className="trends-container">
      <div className="trends-header">
        <h2>🔍 Search & Trends</h2>
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
                      <span className="result-name">🎤 {artist.name}</span>
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
                      <span className="result-name">🎵 {track.trackName}</span>
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
              {selectedItem.type === 'artist' ? '🎤' : '🎵'}{' '}
              {selectedItem.type === 'artist' 
                ? selectedItem.name 
                : `${selectedItem.trackName} - ${selectedItem.artistName}`
              }
            </h3>
          </div>

          {/* Filters */}
          <div className="trends-filters">
            <div className="filter-group">
              <label>Chart Type:</label>
              <div className="chart-type-toggle">
                <button
                  className={`toggle-btn ${chartType === 'bar' ? 'active' : ''}`}
                  onClick={() => setChartType('bar')}
                  aria-label="Bar chart view"
                >
                  📊 Bar
                </button>
                <button
                  className={`toggle-btn ${chartType === 'density' ? 'active' : ''}`}
                  onClick={() => setChartType('density')}
                  aria-label="Density plot view"
                >
                  📈 Density
                </button>
              </div>
            </div>

            <div className="filter-group">
              <label>Granularity:</label>
              <select value={granularity} onChange={(e) => setGranularity(e.target.value)}>
                <option value="day">Day</option>
                <option value="week">Week</option>
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
                    {chartData.data.reduce((max, d) => d.play_count > max.play_count ? d : max, chartData.data[0]).period}
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
                    <div className="tooltip-date">{chartData.data[hoveredIndex].period}</div>
                    <div className="tooltip-stats">
                      <span>🎵 {chartData.data[hoveredIndex].play_count} plays</span>
                      <span>⏱️ {formatTime(chartData.data[hoveredIndex].total_ms)}</span>
                    </div>
                  </div>
                )}

                <div className="chart-y-axis">
                  <span>{chartData.maxPlayCount}</span>
                  <span>{Math.round(chartData.maxPlayCount / 2)}</span>
                  <span>0</span>
                </div>
                <div className="chart-content">
                  {chartType === 'bar' ? (
                    /* Bar Chart */
                    <>
                      <div className="chart-bars">
                        {chartData.data.map((item, idx) => {
                          const heightPercent = (item.play_count / chartData.maxPlayCount) * 100
                          return (
                            <div 
                              key={idx} 
                              className="bar-wrapper"
                            >
                              <div 
                                className={`bar ${hoveredIndex === idx ? 'hovered' : ''}`}
                                style={{ height: `${heightPercent}%` }}
                                onMouseEnter={(e) => handleMouseEnter(idx, e)}
                                onMouseLeave={handleMouseLeave}
                              >
                                <span className="bar-value">{item.play_count}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="chart-x-axis">
                        {chartData.data.map((item, idx) => {
                          const showLabel = chartData.data.length <= 12 || idx % Math.ceil(chartData.data.length / 12) === 0
                          return (
                            <span key={idx} className={showLabel ? '' : 'hidden-label'}>
                              {item.period}
                            </span>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    /* Density Plot */
                    <>
                      <svg className="density-chart" viewBox="0 0 1000 300" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="densityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#1db954" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#1db954" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>
                        
                        {/* Create smooth curve using path */}
                        <path
                          d={(() => {
                            if (chartData.data.length === 0) return ''
                            
                            const width = 1000
                            const height = 300
                            const step = width / (chartData.data.length - 1 || 1)
                            
                            // Generate points for the curve
                            const points = chartData.data.map((item, idx) => ({
                              x: idx * step,
                              y: height - (item.play_count / chartData.maxPlayCount) * height
                            }))
                            
                            // Start path
                            let path = `M 0,${height} L 0,${points[0].y}`
                            
                            // Create smooth curve using quadratic bezier curves
                            for (let i = 0; i < points.length - 1; i++) {
                              const current = points[i]
                              const next = points[i + 1]
                              const midX = (current.x + next.x) / 2
                              
                              path += ` Q ${current.x},${current.y} ${midX},${(current.y + next.y) / 2}`
                            }
                            
                            // Complete the curve to the last point
                            const last = points[points.length - 1]
                            path += ` Q ${last.x},${last.y} ${last.x},${last.y}`
                            
                            // Close the path at the bottom
                            path += ` L ${width},${height} Z`
                            
                            return path
                          })()}
                          fill="url(#densityGradient)"
                          stroke="#1db954"
                          strokeWidth="3"
                        />
                        
                        {/* Add interactive circles for each data point */}
                        {chartData.data.map((item, idx) => {
                          const width = 1000
                          const height = 300
                          const step = width / (chartData.data.length - 1 || 1)
                          const x = idx * step
                          const y = height - (item.play_count / chartData.maxPlayCount) * height
                          
                          return (
                            <g key={idx}>
                              <circle
                                cx={x}
                                cy={y}
                                r={hoveredIndex === idx ? 8 : 5}
                                fill={hoveredIndex === idx ? '#1ed760' : '#1db954'}
                                stroke="white"
                                strokeWidth="2"
                                className="density-point"
                                onMouseEnter={(e) => {
                                  // Convert SVG coordinates to chart container coordinates
                                  const svg = e.currentTarget.ownerSVGElement
                                  const svgRect = svg.getBoundingClientRect()
                                  const chartRect = chartRef.current.getBoundingClientRect()
                                  const scrollLeft = chartRef.current.scrollLeft || 0
                                  
                                  // Calculate the point position in screen coordinates
                                  const pointX = svgRect.left + (x / width) * svgRect.width
                                  const pointY = svgRect.top + (y / height) * svgRect.height
                                  
                                  setHoveredIndex(idx)
                                  setTooltipPosition({
                                    x: pointX - chartRect.left + scrollLeft,
                                    y: pointY - chartRect.top - 10
                                  })
                                }}
                                onMouseLeave={handleMouseLeave}
                                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                              />
                            </g>
                          )
                        })}
                      </svg>
                      <div className="chart-x-axis density-x-axis">
                        {chartData.data.map((item, idx) => {
                          const showLabel = chartData.data.length <= 12 || idx % Math.ceil(chartData.data.length / 12) === 0
                          return (
                            <span key={idx} className={showLabel ? '' : 'hidden-label'}>
                              {item.period}
                            </span>
                          )
                        })}
                      </div>
                    </>
                  )}
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
          <p>👆 Start by searching for an artist or song above</p>
        </div>
      )}
    </div>
  )
}

export default Trends
