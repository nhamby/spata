import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDurationShort } from '../utils'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

function Calendar() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState({})
  const [loading, setLoading] = useState(true)
  const [availableYears, setAvailableYears] = useState([])
  const [availableMonths, setAvailableMonths] = useState([])

  useEffect(() => {
    fetchAvailableYears()
  }, [])

  useEffect(() => {
    fetchCalendarData()
  }, [currentDate])

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/available-years`)
      if (!response.ok) throw new Error('Failed to fetch years')
      
      const data = await response.json()
      setAvailableYears(data.years)
      
      // Also fetch months for current year
      fetchAvailableMonthsForYear(new Date().getFullYear().toString())
    } catch (err) {
      console.error('Error fetching years:', err)
    }
  }

  const fetchAvailableMonthsForYear = async (year) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/available-months?years=${year}`)
      if (!response.ok) throw new Error('Failed to fetch months')
      
      const data = await response.json()
      setAvailableMonths(data.months)
    } catch (err) {
      console.error('Error fetching months:', err)
    }
  }

  const fetchCalendarData = async () => {
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      
      const response = await fetch(`${API_BASE_URL}/api/calendar-data?year=${year}&month=${month}`)
      if (!response.ok) throw new Error('Failed to fetch calendar data')
      
      const data = await response.json()
      
      // Convert array to object keyed by date for easier lookup
      const dataByDate = {}
      data.calendar_data.forEach(item => {
        dataByDate[item.date] = item
      })
      
      setCalendarData(dataByDate)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching calendar data:', err)
      setLoading(false)
    }
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value)
    const newDate = new Date(newYear, currentDate.getMonth(), 1)
    setCurrentDate(newDate)
    fetchAvailableMonthsForYear(newYear.toString())
  }

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value)
    const newDate = new Date(currentDate.getFullYear(), newMonth, 1)
    setCurrentDate(newDate)
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const handleDayClick = (day) => {
    if (!day) return
    
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayStr}`
    
    // Check if there's data for this day
    if (calendarData[dateStr]) {
      navigate(`/day/${dateStr}`)
    }
  }

  const getDateData = (day) => {
    if (!day) return null
    
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayStr}`
    
    return calendarData[dateStr]
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="nav-btn" onClick={previousMonth}>←</button>
        <div className="calendar-selectors">
          <select 
            className="year-select" 
            value={currentDate.getFullYear()} 
            onChange={handleYearChange}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select 
            className="month-select" 
            value={currentDate.getMonth()} 
            onChange={handleMonthChange}
          >
            {monthNames.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
        </div>
        <button className="nav-btn" onClick={nextMonth}>→</button>
      </div>

      {loading && (
        <div className="loading">Loading calendar data...</div>
      )}

      {!loading && (
        <div className="calendar-grid">
          {/* Day headers */}
          {dayNames.map(day => (
            <div key={day} className="calendar-day-header">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {getDaysInMonth().map((day, index) => {
            const dayData = getDateData(day)
            const hasData = !!dayData
            
            return (
              <div
                key={index}
                className={`calendar-day ${!day ? 'empty' : ''} ${hasData ? 'has-data' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                {day && (
                  <>
                    <div className="day-number">{day}</div>
                    {hasData && (
                      <div className="day-stats">
                        <div className="stream-count">{dayData.stream_count} songs</div>
                        <div className="duration">{formatDurationShort(dayData.total_ms)}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Calendar
