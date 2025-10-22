import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatDurationShort } from '../utils'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

function DailyView() {
  const { date } = useParams()
  const navigate = useNavigate()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDailySongs()
  }, [date])

  const fetchDailySongs = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Fetching songs for date:', date)
      const response = await fetch(`${API_BASE_URL}/api/daily-songs?date=${date}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`Failed to fetch daily songs: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Received data:', data)
      setSongs(data.songs)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching daily songs:', err)
      setError(`Failed to load songs for this date: ${err.message}`)
      setLoading(false)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getTotalDuration = () => {
    return songs.reduce((total, song) => total + (song.msPlayed || 0), 0)
  }

  return (
    <div className="daily-view-container">
      <div className="daily-header">
        <button className="back-btn" onClick={() => navigate('/calendar')}>
          ← Back to Calendar
        </button>
        <h1>{formatDate(date)}</h1>
        <div className="daily-summary">
          <span>{songs.length} songs</span>
          <span>•</span>
          <span>{formatDurationShort(getTotalDuration())}</span>
        </div>
      </div>

      {loading && (
        <div className="loading">Loading songs...</div>
      )}

      {error && (
        <div className="error">{error}</div>
      )}

      {!loading && !error && songs.length === 0 && (
        <div className="no-data">No songs found for this date</div>
      )}

      {!loading && !error && songs.length > 0 && (
        <div className="songs-timeline">
          {songs.map((song, index) => (
            <div key={index} className="song-card">
              <div className="song-time">{formatTime(song.endTime)}</div>
              <div className="song-details">
                <div className="song-info">
                  <div className="song-track">{song.trackName || 'Unknown Track'}</div>
                  <div className="song-artist">{song.artistName || 'Unknown Artist'}</div>
                  {song.albumName && (
                    <div className="song-album">{song.albumName}</div>
                  )}
                </div>
                <div className="song-metadata">
                  <div className="song-duration">{formatDurationShort(song.msPlayed)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DailyView
