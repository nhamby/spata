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
  const searchTimeoutRef = useRef(null)

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

  const fetchTrends = async () => {
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
  }

  const handleSelectItem = (item) => {
    setSelectedItem(item)
    setSearchQuery('')
    setSearchResults({ artists: [], tracks: [] })
  }

  const clearSelection = () => {
    setSelectedItem(null)
    setTrendsData(null)
    setStartDate('')
    setEndDate('')
  }

  // Calculate chart dimensions and data
  const getChartData = () => {
    if (!trendsData || !trendsData.data.length) return null

    const data = trendsData.data
    const maxPlayCount = Math.max(...data.map(d => d.play_count))
    const maxDuration = Math.max(...data.map(d => d.total_ms))

    return { data, maxPlayCount, maxDuration }
  }

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
              </div>

              <div className="chart">
                <div className="chart-y-axis">
                  <span>{chartData.maxPlayCount}</span>
                  <span>{Math.round(chartData.maxPlayCount / 2)}</span>
                  <span>0</span>
                </div>
                <div className="chart-content">
                  <div className="chart-bars">
                    {chartData.data.map((item, idx) => {
                      const heightPercent = (item.play_count / chartData.maxPlayCount) * 100
                      return (
                        <div key={idx} className="bar-wrapper">
                          <div 
                            className="bar"
                            style={{ height: `${heightPercent}%` }}
                            title={`${item.period}: ${item.play_count} plays, ${formatTime(item.total_ms)}`}
                          >
                            <span className="bar-value">{item.play_count}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="chart-x-axis">
                    {chartData.data.map((item, idx) => {
                      // Show every nth label depending on data length
                      const showLabel = chartData.data.length <= 12 || idx % Math.ceil(chartData.data.length / 12) === 0
                      return (
                        <span key={idx} className={showLabel ? '' : 'hidden-label'}>
                          {item.period}
                        </span>
                      )
                    })}
                  </div>
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
