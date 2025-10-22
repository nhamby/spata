# Spotify Data Analysis Tool (SPATA)

A locally hosted web application for analyzing your personal Spotify extended streaming history. Built with a Python/FastAPI backend and React frontend, containerized with Docker for easy deployment.

## Quick Start (Docker - Recommended)

**Prerequisites:** Docker Desktop installed - <https://www.docker.com/products/docker-desktop>

```bash
# 1. Load your Spotify data (one-time setup)
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python load_data.py
cd ..

# 2. Start the application
./start.sh
```

**Access the application:** Open <http://localhost:3000> in your browser.

**To stop:** Run `./stop.sh` or `docker compose down`

## Table of Contents

- [Background](#background)
- [Features](#features)
- [Getting Your Spotify Data](#getting-your-spotify-data)
- [Docker Setup](#docker-setup)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Technical Architecture](#technical-architecture)
- [Project Structure](#project-structure)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [Data Privacy](#data-privacy)
- [Updating Data](#updating-data)
- [License](#license)

## Background

SPATA (Spotify Data Analysis Tool) is a privacy-focused, locally-hosted web application that allows you to analyze your personal Spotify listening history. Unlike cloud-based analytics tools, all your data stays on your computer.

The application processes Spotify's Extended Streaming History data to provide insights into your listening habits over time, including total listening time, top artists, and most-played songs, with the ability to filter by year.

Built with modern web technologies (FastAPI for the backend, React for the frontend) and containerized with Docker for easy deployment, SPATA provides a Spotify-inspired interface to explore years of your music history.

## Features

- **Dashboard Analytics**: View total listening time, top artists, and top songs (Top 20 each)
- **Multi-Filter System**: Filter by years, months, or seasons with multi-select support
- **Calendar View**: Visual calendar showing daily listening activity with song counts
- **Daily Breakdown**: Click any date to see all songs played that day with timestamps and album info
- **Smart Navigation**: Year and month dropdown selectors for quick date navigation
- **Responsive Design**: Modern, Spotify-inspired UI that works on desktop and mobile
- **Privacy First**: All data processing happens locally - nothing leaves your computer
- **Fast Performance**: SQLite database with indexed queries for instant results
- **Easy Deployment**: Fully containerized with Docker for one-command setup

## Getting Your Spotify Data

Before using SPATA, you need to request your Extended Streaming History from Spotify:

1. Visit [Spotify Account Privacy Settings](https://www.spotify.com/account/privacy/)
2. Scroll down to "Download your data"
3. Select "Extended streaming history" (not just "Account data")
4. Submit request - Spotify will email you when ready (can take up to 30 days)
5. Download the ZIP file from the email
6. Extract the ZIP file
7. Place the JSON files in `data/spotify_extended_streaming_history_*/` directory

Your data folder should look like this:

```text
data/
  spotify_extended_streaming_history_2025_10_3/
    Streaming_History_Audio_2016-2018_0.json
    Streaming_History_Audio_2018-2019_1.json
    ...
```

## Docker Setup

**Best for:** Everyone who wants the easiest setup with minimal dependencies

**Prerequisites:**

- Docker Desktop - <https://www.docker.com/products/docker-desktop>
- Your Spotify Extended Streaming History files

**Steps:**

1. Load your data (one-time setup):

   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python load_data.py
   cd ..
   ```

2. Start the application:

   ```bash
   ./start.sh
   ```

   Or manually:

   ```bash
   docker compose up -d
   ```

3. Access the application:
   - Frontend: <http://localhost:3000>
   - Backend API: <http://localhost:8080>

**Docker Commands:**

```bash
# Start the application
./start.sh
# or
docker compose up -d

# Stop the application
./stop.sh
# or
docker compose down

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up -d --build

# Check container status
docker compose ps
```

**Benefits:**

- No need to install Python, Node.js, or manage dependencies
- Consistent environment across all machines
- Production-ready setup with Nginx
- One command to start/stop
- Automatic health checks and restart on failure

## Usage

Once the application is running, navigate between two main views:

### Dashboard (Home)

1. **Multi-Filter Selection**:
   - **Years**: Select one or multiple years to analyze
   - **Seasons**: Filter by Spring, Summer, Fall, or Winter
   - **Months**: Choose specific months (or use seasons for broader filtering)
   - Filters can be combined for precise time ranges

2. **View Statistics**:
   - **Total Listening Time**: Displayed in days, hours, and minutes
   - **Top 20 Artists**: Ranked by total play time
   - **Top 20 Songs**: Most-played tracks with artist names

3. **Filter Controls**:
   - Use "Select All" / "Clear All" buttons for quick selection
   - "Deselect All" appears when partial selections are made
   - Filters update smoothly with debouncing (no page flashing)

### Calendar View

1. **Month Navigation**:
   - Use arrow buttons to move month-by-month
   - Select year and month from dropdowns for quick navigation

2. **Daily Activity**:
   - Green-highlighted dates indicate listening activity
   - Each date shows song count and total duration
   - Click any green date to view detailed breakdown

3. **Daily Song List**:
   - Chronological list of all songs played that day
   - Shows track name, artist, album, and timestamp
   - Total songs and duration displayed at top
   - "Back to Calendar" button for easy navigation

The interface updates in real-time as you change filters, providing instant insights into your listening habits.

## API Documentation

The backend provides a REST API for accessing your Spotify data.

### Base URL

- Docker: `http://localhost:8080`

### Endpoints

#### GET /api/available-years

Returns all years present in your streaming history.

**Response:**

```json
{
  "years": ["2025", "2024", "2023", "2022", "2021"]
}
```

#### GET /api/available-months

Returns available year-month combinations, optionally filtered by years.

**Query Parameters:**

- `years` (optional): Array of years to filter by (e.g., `?years=2024&years=2025`)

**Response:**

```json
{
  "months": [
    {"year": "2024", "month": "12"},
    {"year": "2024", "month": "11"}
  ]
}
```

#### GET /api/available-seasons

Returns available seasons, optionally filtered by years.

**Query Parameters:**

- `years` (optional): Array of years to filter by

**Response:**

```json
{
  "seasons": ["spring", "summer", "fall", "winter"]
}
```

#### GET /api/stats

Returns comprehensive statistics with flexible filtering.

**Query Parameters:**

- `years` (optional): Array of years (e.g., `?years=2024&years=2023`)
- `months` (optional): Array of months 01-12 (e.g., `?months=01&months=02`)
- `seasons` (optional): Array of seasons (e.g., `?seasons=spring&seasons=summer`)

**Response:**

```json
{
  "total_ms_played": 789012345,
  "top_artists": [
    {
      "artistName": "Artist Name",
      "duration_ms": 12345678
    }
  ],
  "top_songs": [
    {
      "trackName": "Song Name",
      "artistName": "Artist Name",
      "duration_ms": 1234567
    }
  ]
}
```

#### GET /api/calendar-data

Returns daily listening data for calendar view.

**Query Parameters:**

- `year` (optional): Filter by specific year (e.g., `?year=2024`)
- `month` (optional): Filter by specific month 01-12 (e.g., `?month=06`)

**Response:**

```json
{
  "calendar_data": [
    {
      "date": "2024-06-15",
      "stream_count": 42,
      "total_ms": 7200000
    }
  ]
}
```

#### GET /api/daily-songs

Returns all songs played on a specific date with metadata.

**Query Parameters:**

- `date` (required): Date in YYYY-MM-DD format (e.g., `?date=2024-06-15`)

**Response:**

```json
{
  "date": "2024-06-15",
  "song_count": 42,
  "songs": [
    {
      "trackName": "Song Name",
      "artistName": "Artist Name",
      "albumName": "Album Name",
      "msPlayed": 234567,
      "endTime": "2024-06-15T14:30:00Z"
    }
  ]
}
```

#### GET /api/health

Health check endpoint to verify database connectivity.

**Response:**

```json
{
  "status": "healthy",
  "total_streams": 132245
}
}
```

#### GET /

Root endpoint - returns API status.

**Response:**

```json
{
  "message": "Spotify Analytics API",
  "status": "running"
}
```

## Technical Architecture

### Backend Stack

- **Framework**: FastAPI (Python 3.13)
- **Database**: SQLite with indexed queries on `songs` table
- **Data Processing**: Pandas for ETL operations
- **Server**: Uvicorn ASGI server
- **Features**:
  - RESTful API with multi-parameter filtering
  - CORS enabled for local development
  - Automatic data validation with Pydantic
  - SQL injection protection with parameterized queries
  - Filters streams < 5 seconds as noise
  - Separates songs, podcasts, and audiobooks into dedicated tables

### Frontend Stack

- **Framework**: React 18 with React Router
- **Build Tool**: Vite 5
- **Styling**: Pure CSS with modern features
- **State Management**: React Hooks (useState, useEffect, useCallback, useRef)
- **HTTP Client**: Fetch API
- **Features**:
  - Multi-page navigation (Dashboard, Calendar, Daily View)
  - Multi-select filtering with debouncing (300ms)
  - Responsive design (mobile-friendly)
  - Real-time filtering with smooth transitions
  - Loading and error states
  - Staggered animations for list items

### Docker Architecture

- **Backend Container**: Python 3.12-slim image
- **Frontend Container**: Multi-stage build (Node.js to Nginx Alpine)
- **Orchestration**: Docker Compose
- **Networking**: Internal Docker network
- **Volumes**: Database mounted as read-only
- **Health Checks**: Automatic monitoring of both services
- **Auto-restart**: Services restart on failure

### Data Flow

```text
Spotify JSON Files
        ↓
  load_data.py (ETL)
        ↓
   SQLite Database
        ↓
   FastAPI Backend
        ↓
    REST API
        ↓
  React Frontend
        ↓
     User Browser
```

### Database Schema

The SQLite database (`spotify.db`) contains four tables:

#### 1. `songs` Table (Primary)

Main table for music tracks - used for analytics and visualizations.

| Column | Type | Description |
|--------|------|-------------|
| `endTime` | DATETIME | When the track finished playing |
| `msPlayed` | INTEGER | Milliseconds played |
| `artistName` | TEXT | Artist name |
| `trackName` | TEXT | Track/song name |
| `albumName` | TEXT | Album name |
| `trackUri` | TEXT | Spotify track URI |

**Indexes:** `endTime`, `artistName`, `trackName`, `albumName`

#### 2. `streams` Table (Legacy/Compatibility)

Simplified view of songs table for backward compatibility with older queries.

| Column | Type | Description |
|--------|------|-------------|
| `endTime` | DATETIME | When the track finished playing |
| `msPlayed` | INTEGER | Milliseconds played |
| `artistName` | TEXT | Artist name |
| `trackName` | TEXT | Track/song name |

**Indexes:** `endTime`, `artistName`, `trackName`

#### 3. `podcasts` Table (Future Use)

Stores podcast episode listening history.

| Column | Type | Description |
|--------|------|-------------|
| `endTime` | DATETIME | When the episode finished playing |
| `msPlayed` | INTEGER | Milliseconds played |
| `showName` | TEXT | Podcast show name |
| `episodeName` | TEXT | Episode name |
| `episodeUri` | TEXT | Spotify episode URI |

**Indexes:** `endTime`, `showName`

#### 4. `audiobooks` Table (Future Use)

Stores audiobook chapter listening history.

| Column | Type | Description |
|--------|------|-------------|
| `endTime` | DATETIME | When the chapter finished playing |
| `msPlayed` | INTEGER | Milliseconds played |
| `bookTitle` | TEXT | Audiobook title |
| `chapterTitle` | TEXT | Chapter title |
| `bookUri` | TEXT | Spotify audiobook URI |
| `chapterUri` | TEXT | Spotify chapter URI |

**Indexes:** `endTime`, `bookTitle`

**Note:** The application currently focuses on songs analysis. Podcast and audiobook tables are populated but not yet used in the UI.

## Project Structure

```text
spata/
├── backend/
│   ├── Dockerfile              # Backend container definition
│   ├── .dockerignore          # Docker build exclusions
│   ├── main.py                # FastAPI application with 7 endpoints
│   ├── load_data.py           # Data ingestion script (auto-finds data folder)
│   ├── requirements.txt       # Python dependencies
│   └── spotify.db            # SQLite database (generated)
│
├── frontend/
│   ├── Dockerfile             # Frontend container definition
│   ├── .dockerignore         # Docker build exclusions
│   ├── nginx.conf            # Nginx configuration
│   ├── .env.docker           # Docker environment variables
│   ├── src/
│   │   ├── App.jsx          # Main app with routing
│   │   ├── main.jsx         # React entry point
│   │   ├── index.css        # Application styles
│   │   ├── utils.js         # Helper functions (time formatting)
│   │   └── pages/
│   │       ├── Dashboard.jsx    # Home view with filters and stats
│   │       ├── Calendar.jsx     # Calendar view with month navigation
│   │       └── DailyView.jsx    # Daily song list view
│   ├── index.html           # HTML template
│   ├── package.json         # Node dependencies (includes react-router-dom)
│   └── vite.config.js       # Vite configuration
│
├── data/
│   └── spotify_extended_streaming_history_*/
│       └── Streaming_History_Audio_*.json  # Your Spotify data
│
├── compose.yml               # Docker Compose configuration
├── start.sh                  # Easy start script
├── stop.sh                   # Easy stop script
├── .gitignore                # Protects personal data from git
├── README.md                 # This file
└── LICENSE                   # MIT License
```

## Customization

### Change Number of Top Items

In `backend/main.py`, modify the `LIMIT` clause:

```python
# Find the SQL queries around lines 77 and 96
LIMIT 20  # Change to 50, 100, or any number
```

### Adjust Minimum Stream Duration

In `backend/load_data.py`, modify the filter threshold:

```python
# Around line 71
df = df[df['msPlayed'] >= 5000]  # 5000ms = 5 seconds
# Change to filter more aggressively (e.g., 30000 for 30 seconds)
```

### Customize UI Colors

In `frontend/src/index.css`:

```css
/* Spotify green gradient - change to your preferred colors */
background: linear-gradient(135deg, #1db954, #1ed760);

/* Or use a different color scheme entirely */
background: linear-gradient(135deg, #667eea, #764ba2);  /* Purple */
background: linear-gradient(135deg, #f093fb, #f5576c);  /* Pink */
```

### Modify Backend Port

In `compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8080:8080"  # Change 8080 to your preferred port
```

### Change Frontend Port

In `compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "3001:80"  # Change 3001 to your preferred port
```

## Troubleshooting

### Docker Issues

**Docker not running:**

- Ensure Docker Desktop is installed and running
- Check system tray/menu bar for Docker icon

**Port already in use:**

```bash
# Find process using port 8080
lsof -ti:8080 | xargs kill -9

# Or change ports in compose.yml
```

**Database not found:**

```bash
# Make sure you've run the data loader
cd backend
source venv/bin/activate
python load_data.py
```

**Containers won't start:**

```bash
# Check logs for errors
docker compose logs backend
docker compose logs frontend

# Try rebuilding
docker compose down
docker compose up -d --build
```

### Data Loading Issues

**No data appearing:**

- Verify JSON files are in `data/spotify_extended_streaming_history_*/`
- Check file names match pattern: `Streaming_History_Audio_*.json`
- Re-run `python load_data.py` to reload

**Import errors during data loading:**

```bash
# Ensure virtual environment is activated
source backend/venv/bin/activate

# Reinstall dependencies
pip install --upgrade -r backend/requirements.txt
```

### Frontend Issues

**Blank page or errors:**

- Check browser console (F12) for JavaScript errors
- Verify backend is running: `curl http://localhost:8080/api/health`
- Check CORS settings in `backend/main.py`

**API connection failed:**

- Backend URL is set via `VITE_API_URL` environment variable (defaults to `http://localhost:8080`)
- Docker: Uses `.env.docker` file
- Verify backend is accessible: `curl http://localhost:8080/api/health`

### Performance Issues

**Slow queries:**

- Database should have indexes (created automatically by `load_data.py`)
- Try reducing top items limit (see Customization section)

**High memory usage:**

- Expected with large datasets (100k+ streams)
- Docker containers will use ~500MB RAM total

## Data Privacy

Your data stays private:

- **Runs locally** - Everything processes on your computer
- **No external connections** - Application doesn't connect to internet
- **No data upload** - Your listening history never leaves your machine
- **No tracking** - No analytics or telemetry
- **Open source** - Inspect the code yourself

## Updating Data

When you get new Spotify data exports:

1. Stop the application:

   ```bash
   ./stop.sh
   # or
   docker compose down
   ```

2. Replace or add new JSON files to `data/spotify_extended_streaming_history_*/`

3. Reload the database:

   ```bash
   cd backend
   source venv/bin/activate
   python load_data.py
   cd ..
   ```

4. Restart the application:

   ```bash
   ./start.sh
   # or
   docker compose up -d
   ```

The `load_data.py` script will replace the existing database with the updated data.

## License

See [LICENSE](LICENSE) file for details.
