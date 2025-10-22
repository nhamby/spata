import { useState, useEffect, useCallback, useRef } from 'react'
import { formatDuration, formatDurationShort } from '../utils'

// Use environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

function Dashboard() {
  const [years, setYears] = useState([])
  const [months, setMonths] = useState([])
  const [seasons, setSeasons] = useState([])
  const [selectedYears, setSelectedYears] = useState([])
  const [selectedMonths, setSelectedMonths] = useState([])
  const [selectedSeasons, setSelectedSeasons] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Use ref to track the debounce timer
  const debounceTimer = useRef(null)

  // Fetch available years on component mount
  useEffect(() => {
    fetchYears()
  }, [])

  // Fetch available months and seasons when years change
  useEffect(() => {
    fetchMonths()
    fetchSeasons()
  }, [selectedYears])

  // Debounced fetch stats whenever filters change
  useEffect(() => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // Set transition state immediately for smooth feedback
    setIsTransitioning(true)
    
    // Debounce the API call
    debounceTimer.current = setTimeout(() => {
      fetchStats()
    }, 300) // 300ms debounce
    
    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [selectedYears, selectedMonths, selectedSeasons])

  const fetchYears = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/available-years`)
      if (!response.ok) throw new Error('Failed to fetch years')
      
      const data = await response.json()
      setYears(data.years)
    } catch (err) {
      console.error('Error fetching years:', err)
      setError('Failed to load available years')
    }
  }

  const fetchMonths = async () => {
    try {
      let url = `${API_BASE_URL}/api/available-months`
      if (selectedYears.length > 0) {
        const yearParams = selectedYears.map(y => `years=${y}`).join('&')
        url += `?${yearParams}`
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch months')
      
      const data = await response.json()
      setMonths(data.months)
    } catch (err) {
      console.error('Error fetching months:', err)
    }
  }

  const fetchSeasons = async () => {
    try {
      let url = `${API_BASE_URL}/api/available-seasons`
      if (selectedYears.length > 0) {
        const yearParams = selectedYears.map(y => `years=${y}`).join('&')
        url += `?${yearParams}`
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch seasons')
      
      const data = await response.json()
      setSeasons(data.seasons)
    } catch (err) {
      console.error('Error fetching seasons:', err)
    }
  }

  const fetchStats = async () => {
    setError(null)
    
    try {
      let url = `${API_BASE_URL}/api/stats`
      const params = []
      
      if (selectedYears.length > 0) {
        selectedYears.forEach(year => params.push(`years=${year}`))
      }
      
      if (selectedSeasons.length > 0) {
        selectedSeasons.forEach(season => params.push(`seasons=${season}`))
      } else if (selectedMonths.length > 0) {
        // Only use months if seasons not selected
        selectedMonths.forEach(month => params.push(`months=${month}`))
      }
      
      if (params.length > 0) {
        url += `?${params.join('&')}`
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch statistics')
      
      const data = await response.json()
      
      // Small delay to ensure smooth transition
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setStats(data)
      setLoading(false)
      setIsTransitioning(false)
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Failed to load statistics. Make sure the backend is running.')
      setLoading(false)
      setIsTransitioning(false)
    }
  }

  const handleYearToggle = useCallback((year) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        return prev.filter(y => y !== year)
      } else {
        return [...prev, year].sort()
      }
    })
  }, [])

  const handleMonthToggle = useCallback((month) => {
    setSelectedMonths(prev => {
      if (prev.includes(month)) {
        return prev.filter(m => m !== month)
      } else {
        return [...prev, month].sort()
      }
    })
  }, [])

  const handleSeasonToggle = useCallback((season) => {
    setSelectedSeasons(prev => {
      if (prev.includes(season)) {
        return prev.filter(s => s !== season)
      } else {
        return [...prev, season]
      }
    })
  }, [])

  const handleSelectAllYears = useCallback(() => {
    if (selectedYears.length === years.length) {
      setSelectedYears([])
    } else {
      setSelectedYears([...years])
    }
  }, [selectedYears.length, years])

  const handleClearAllYears = useCallback(() => {
    setSelectedYears([])
  }, [])

  const handleSelectAllMonths = useCallback(() => {
    const uniqueMonths = [...new Set(months.map(m => m.month))]
    if (selectedMonths.length === uniqueMonths.length) {
      setSelectedMonths([])
    } else {
      setSelectedMonths(uniqueMonths)
    }
  }, [selectedMonths.length, months])

  const handleClearAllMonths = useCallback(() => {
    setSelectedMonths([])
  }, [])

  const handleSelectAllSeasons = useCallback(() => {
    if (selectedSeasons.length === seasons.length) {
      setSelectedSeasons([])
    } else {
      setSelectedSeasons([...seasons])
    }
  }, [selectedSeasons.length, seasons])

  const handleClearAllSeasons = useCallback(() => {
    setSelectedSeasons([])
  }, [])

  const getMonthName = (monthNum) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return monthNames[parseInt(monthNum) - 1]
  }

  const capitalizeFirst = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const getFilterDescription = () => {
    if (selectedYears.length === 0 && selectedMonths.length === 0 && selectedSeasons.length === 0) {
      return 'All Time'
    }
    
    let desc = []
    if (selectedYears.length > 0) {
      if (selectedYears.length === years.length) {
        desc.push('All Years')
      } else {
        desc.push(selectedYears.join(', '))
      }
    }
    
    if (selectedSeasons.length > 0) {
      if (selectedSeasons.length === seasons.length) {
        desc.push('All Seasons')
      } else {
        desc.push(selectedSeasons.map(capitalizeFirst).join(', '))
      }
    } else if (selectedMonths.length > 0) {
      if (selectedMonths.length === 12) {
        desc.push('All Months')
      } else {
        desc.push(selectedMonths.map(getMonthName).join(', '))
      }
    }
    
    return desc.join(' • ')
  }

  return (
    <>
      <div className="filters-container">
        <div className="filter-section">
          <div className="filter-header">
            <label>Years</label>
            <div className="filter-actions">
              <button className="select-all-btn" onClick={handleSelectAllYears}>
                {selectedYears.length === years.length ? 'Clear All' : 'Select All'}
              </button>
              {selectedYears.length > 0 && selectedYears.length < years.length && (
                <button className="clear-btn" onClick={handleClearAllYears}>
                  Deselect All
                </button>
              )}
            </div>
          </div>
          <div className="filter-chips">
            {years.map(year => (
              <button
                key={year}
                className={`filter-chip ${selectedYears.includes(year) ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  handleYearToggle(year)
                }}
                type="button"
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {seasons.length > 0 && (
          <div className="filter-section">
            <div className="filter-header">
              <label>Seasons</label>
              <div className="filter-actions">
                <button className="select-all-btn" onClick={handleSelectAllSeasons}>
                  {selectedSeasons.length === seasons.length ? 'Clear All' : 'Select All'}
                </button>
                {selectedSeasons.length > 0 && selectedSeasons.length < seasons.length && (
                  <button className="clear-btn" onClick={handleClearAllSeasons}>
                    Deselect All
                  </button>
                )}
              </div>
            </div>
            <div className="filter-chips">
              {seasons.map(season => (
                <button
                  key={season}
                  className={`filter-chip ${selectedSeasons.includes(season) ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    handleSeasonToggle(season)
                  }}
                  type="button"
                >
                  {capitalizeFirst(season)}
                </button>
              ))}
            </div>
          </div>
        )}

        {months.length > 0 && selectedSeasons.length === 0 && (
          <div className="filter-section">
            <div className="filter-header">
              <label>Months</label>
              <div className="filter-actions">
                <button className="select-all-btn" onClick={handleSelectAllMonths}>
                  {selectedMonths.length === [...new Set(months.map(m => m.month))].length ? 'Clear All' : 'Select All'}
                </button>
                {selectedMonths.length > 0 && selectedMonths.length < [...new Set(months.map(m => m.month))].length && (
                  <button className="clear-btn" onClick={handleClearAllMonths}>
                    Deselect All
                  </button>
                )}
              </div>
            </div>
            <div className="filter-chips">
              {[...new Set(months.map(m => m.month))].sort().map(month => (
                <button
                  key={month}
                  className={`filter-chip ${selectedMonths.includes(month) ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    handleMonthToggle(month)
                  }}
                  type="button"
                >
                  {getMonthName(month)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="current-filter">
          Showing: <strong>{getFilterDescription()}</strong>
        </div>
      </div>

      {loading && !stats && (
        <div className="loading">Loading your data...</div>
      )}

      {error && (
        <div className="error">{error}</div>
      )}

      {stats && (
        <div className={`stats-container ${isTransitioning ? 'transitioning' : ''}`}>
          {/* Total Time Card */}
          <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
            <h2>Total Listening Time</h2>
            <div className="total-time">
              {formatDuration(stats.total_ms_played)}
            </div>
          </div>

          {/* Top Artists Card */}
          <div className="stat-card">
            <h2>Top Artists</h2>
            <div className="list-container">
              {stats.top_artists.length > 0 ? (
                stats.top_artists.map((artist, index) => (
                  <div key={index} className="list-item">
                    <div className="list-item-rank">#{index + 1}</div>
                    <div className="list-item-info">
                      <div className="list-item-name">{artist.artistName}</div>
                    </div>
                    <div className="list-item-duration">
                      {formatDurationShort(artist.duration_ms)}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Top Songs Card */}
          <div className="stat-card">
            <h2>Top Songs</h2>
            <div className="list-container">
              {stats.top_songs.length > 0 ? (
                stats.top_songs.map((song, index) => (
                  <div key={index} className="list-item">
                    <div className="list-item-rank">#{index + 1}</div>
                    <div className="list-item-info">
                      <div className="list-item-name">{song.trackName}</div>
                      <div className="list-item-artist">{song.artistName}</div>
                    </div>
                    <div className="list-item-duration">
                      {formatDurationShort(song.duration_ms)}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Dashboard
