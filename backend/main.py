"""
FastAPI backend for Spotify streaming history analysis.
"""

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Spotify Analytics API",
    description="API for analyzing personal Spotify streaming history",
    version="1.0.0",
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database path
DB_PATH = Path(__file__).parent / "spotify.db"


@contextmanager
def get_db_connection():
    """Context manager for database connections with proper cleanup."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@app.get("/")
def read_root():
    """Root endpoint."""
    return {"message": "Spotify Analytics API", "status": "running"}


@app.get("/api/available-years")
def get_available_years():
    """
    Get all available years from the streaming history.
    Returns a sorted list of years in descending order.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Extract distinct years from endTime
            query = """
                SELECT DISTINCT strftime('%Y', endTime) as year
                FROM songs
                WHERE year IS NOT NULL
                ORDER BY year DESC
            """

            cursor.execute(query)
            rows = cursor.fetchall()
            years = [row["year"] for row in rows]

        return {"years": years}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/available-months")
def get_available_months(
    years: Optional[List[str]] = Query(None, description="Filter by specific years")
):
    """
    Get all available year-month combinations from the streaming history.
    Optionally filter by specific years.
    Returns a list of objects with year and month.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Build WHERE clause for year filtering
            where_clause = ""
            params = []
            if years and len(years) > 0:
                placeholders = ",".join(["?" for _ in years])
                where_clause = f"WHERE strftime('%Y', endTime) IN ({placeholders})"
                params = years

            # Extract distinct year-month combinations
            query = f"""
                SELECT DISTINCT 
                    strftime('%Y', endTime) as year,
                    strftime('%m', endTime) as month
                FROM songs
                {where_clause}
                ORDER BY year DESC, month DESC
            """

            cursor.execute(query, params)
            rows = cursor.fetchall()
            months = [{"year": row["year"], "month": row["month"]} for row in rows]

        return {"months": months}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


def get_season_from_month(month: str) -> str:
    """Convert month number to season."""
    month_int = int(month)
    if month_int in [12, 1, 2]:
        return "winter"
    elif month_int in [3, 4, 5]:
        return "spring"
    elif month_int in [6, 7, 8]:
        return "summer"
    else:  # 9, 10, 11
        return "fall"


@app.get("/api/available-seasons")
def get_available_seasons(
    years: Optional[List[str]] = Query(None, description="Filter by specific years")
):
    """
    Get all available seasons from the streaming history.
    Optionally filter by specific years.
    Returns a list of available seasons.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Build WHERE clause for year filtering
            where_clause = ""
            params = []
            if years and len(years) > 0:
                placeholders = ",".join(["?" for _ in years])
                where_clause = f"WHERE strftime('%Y', endTime) IN ({placeholders})"
                params = years

            # Extract distinct months
            query = f"""
                SELECT DISTINCT strftime('%m', endTime) as month
                FROM songs
                {where_clause}
                ORDER BY month
            """

            cursor.execute(query, params)
            rows = cursor.fetchall()

            # Convert months to seasons and get unique values
            seasons = set()
            for row in rows:
                if row["month"]:
                    seasons.add(get_season_from_month(row["month"]))

            # Return in logical order
            season_order = ["spring", "summer", "fall", "winter"]
            available_seasons = [s for s in season_order if s in seasons]

        return {"seasons": available_seasons}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/stats")
def get_stats(
    years: Optional[List[str]] = Query(
        None, description="Filter by years (e.g., ['2023', '2024'])"
    ),
    months: Optional[List[str]] = Query(
        None, description="Filter by months (e.g., ['01', '02'] for Jan, Feb)"
    ),
    seasons: Optional[List[str]] = Query(
        None, description="Filter by seasons (e.g., ['spring', 'summer'])"
    ),
):
    """
    Get streaming statistics with flexible filtering.

    Args:
        years: Optional list of years to filter by.
        months: Optional list of months (01-12) to filter by.
        seasons: Optional list of seasons ('spring', 'summer', 'fall', 'winter') to filter by.

    Returns:
        JSON object with total_ms_played, top_artists, and top_songs.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Build WHERE clause for filtering
            where_conditions = []
            params = []

            # Filter by years
            if years and len(years) > 0:
                placeholders = ",".join(["?" for _ in years])
                where_conditions.append(f"strftime('%Y', endTime) IN ({placeholders})")
                params.extend(years)

            # Filter by months or seasons (mutually exclusive preference to seasons if both provided)
            if seasons and len(seasons) > 0:
                # Convert seasons to month numbers
                season_months = []
                for season in seasons:
                    if season == "spring":
                        season_months.extend(["03", "04", "05"])
                    elif season == "summer":
                        season_months.extend(["06", "07", "08"])
                    elif season == "fall":
                        season_months.extend(["09", "10", "11"])
                    elif season == "winter":
                        season_months.extend(["12", "01", "02"])

                if season_months:
                    placeholders = ",".join(["?" for _ in season_months])
                    where_conditions.append(
                        f"strftime('%m', endTime) IN ({placeholders})"
                    )
                    params.extend(season_months)
            elif months and len(months) > 0:
                # Only use months filter if seasons not specified
                placeholders = ",".join(["?" for _ in months])
                where_conditions.append(f"strftime('%m', endTime) IN ({placeholders})")
                params.extend(months)

            where_clause = ""
            if where_conditions:
                where_clause = "WHERE " + " AND ".join(where_conditions)

            # Calculate total time played
            total_query = f"""
                SELECT SUM(msPlayed) as total_ms
                FROM songs
                {where_clause}
            """
            cursor.execute(total_query, params)
            total_result = cursor.fetchone()
            total_ms_played = total_result["total_ms"] or 0

            # Get top artists
            artists_query = f"""
                SELECT 
                    artistName,
                    SUM(msPlayed) as duration_ms
                FROM songs
                {where_clause}
                GROUP BY artistName
                HAVING artistName IS NOT NULL
                ORDER BY duration_ms DESC
                LIMIT 20
            """
            cursor.execute(artists_query, params)
            top_artists = [
                {"artistName": row["artistName"], "duration_ms": row["duration_ms"]}
                for row in cursor.fetchall()
            ]

            # Get top songs
            songs_query = f"""
                SELECT 
                    trackName,
                    artistName,
                    SUM(msPlayed) as duration_ms
                FROM songs
                {where_clause}
                GROUP BY trackName, artistName
                HAVING trackName IS NOT NULL AND artistName IS NOT NULL
                ORDER BY duration_ms DESC
                LIMIT 20
            """
            cursor.execute(songs_query, params)
            top_songs = [
                {
                    "trackName": row["trackName"],
                    "artistName": row["artistName"],
                    "duration_ms": row["duration_ms"],
                }
                for row in cursor.fetchall()
            ]

        return {
            "total_ms_played": total_ms_played,
            "top_artists": top_artists,
            "top_songs": top_songs,
        }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/calendar-data")
def get_calendar_data(
    year: Optional[str] = Query(None, description="Filter by specific year"),
    month: Optional[str] = Query(None, description="Filter by specific month (01-12)"),
):
    """
    Get listening data aggregated by date for calendar view.
    Returns dates with stream counts and total duration.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Build WHERE clause
            where_conditions = []
            params = []

            if year:
                where_conditions.append("strftime('%Y', endTime) = ?")
                params.append(year)

            if month:
                where_conditions.append("strftime('%m', endTime) = ?")
                params.append(month)

            where_clause = ""
            if where_conditions:
                where_clause = "WHERE " + " AND ".join(where_conditions)

            # Get data aggregated by date
            query = f"""
                SELECT 
                    DATE(endTime) as date,
                    COUNT(*) as stream_count,
                    SUM(msPlayed) as total_ms
                FROM songs
                {where_clause}
                GROUP BY DATE(endTime)
                ORDER BY date
            """

            cursor.execute(query, params)
            rows = cursor.fetchall()

            calendar_data = [
                {
                    "date": row["date"],
                    "stream_count": row["stream_count"],
                    "total_ms": row["total_ms"],
                }
                for row in rows
            ]

        return {"calendar_data": calendar_data}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/daily-songs")
def get_daily_songs(date: str = Query(..., description="Date in YYYY-MM-DD format")):
    """
    Get all songs listened to on a specific date with full metadata.
    Returns songs in chronological order.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Get all streams for the specified date
            # Note: songs table has: endTime, msPlayed, artistName, trackName, albumName, trackUri
            query = """
                SELECT 
                    trackName,
                    artistName,
                    albumName,
                    msPlayed,
                    endTime
                FROM songs
                WHERE DATE(endTime) = ?
                ORDER BY endTime ASC
            """

            cursor.execute(query, (date,))
            rows = cursor.fetchall()

            songs = [
                {
                    "trackName": row["trackName"],
                    "artistName": row["artistName"],
                    "albumName": row["albumName"],
                    "msPlayed": row["msPlayed"],
                    "endTime": row["endTime"],
                }
                for row in rows
            ]

        return {"date": date, "song_count": len(songs), "songs": songs}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/search")
def search_songs_and_artists(
    query: str = Query(
        ..., min_length=1, description="Search query for song or artist name"
    )
):
    """
    Search for songs and artists matching the query.
    Returns matching artists and tracks.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Search for matching artists
            artists_query = """
                SELECT DISTINCT artistName, COUNT(*) as play_count
                FROM songs
                WHERE artistName LIKE ?
                GROUP BY artistName
                ORDER BY play_count DESC
                LIMIT 10
            """
            cursor.execute(artists_query, (f"%{query}%",))
            artists = [
                {
                    "name": row["artistName"],
                    "type": "artist",
                    "play_count": row["play_count"],
                }
                for row in cursor.fetchall()
            ]

            # Search for matching tracks
            tracks_query = """
                SELECT trackName, artistName, COUNT(*) as play_count
                FROM songs
                WHERE trackName LIKE ? OR artistName LIKE ?
                GROUP BY trackName, artistName
                ORDER BY play_count DESC
                LIMIT 20
            """
            cursor.execute(tracks_query, (f"%{query}%", f"%{query}%"))
            tracks = [
                {
                    "trackName": row["trackName"],
                    "artistName": row["artistName"],
                    "type": "track",
                    "play_count": row["play_count"],
                }
                for row in cursor.fetchall()
            ]

        return {"artists": artists, "tracks": tracks}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/trends")
def get_listening_trends(
    artist_name: Optional[str] = Query(None, description="Artist name to filter by"),
    track_name: Optional[str] = Query(None, description="Track name to filter by"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    granularity: str = Query(
        "month", description="Aggregation level: 'day', 'week', 'month', or 'year'"
    ),
):
    """
    Get listening trends over time for a specific artist or track.
    Returns time-series data showing play counts and duration.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Build WHERE clause
            where_conditions = []
            params = []

            if artist_name:
                where_conditions.append("artistName = ?")
                params.append(artist_name)

            if track_name:
                where_conditions.append("trackName = ?")
                params.append(track_name)

            if start_date:
                where_conditions.append("DATE(endTime) >= ?")
                params.append(start_date)

            if end_date:
                where_conditions.append("DATE(endTime) <= ?")
                params.append(end_date)

            where_clause = ""
            if where_conditions:
                where_clause = "WHERE " + " AND ".join(where_conditions)

            # Determine date grouping based on granularity
            if granularity == "day":
                date_format = "%Y-%m-%d"
                date_group = "DATE(endTime)"
            elif granularity == "week":
                date_format = "%Y-W%W"  # Year-Week format
                date_group = "strftime('%Y-W%W', endTime)"
            elif granularity == "year":
                date_format = "%Y"
                date_group = "strftime('%Y', endTime)"
            else:  # default to month
                date_format = "%Y-%m"
                date_group = "strftime('%Y-%m', endTime)"

            # Get aggregated data
            query = f"""
                SELECT 
                    {date_group} as period,
                    COUNT(*) as play_count,
                    SUM(msPlayed) as total_ms
                FROM songs
                {where_clause}
                GROUP BY period
                ORDER BY period ASC
            """

            cursor.execute(query, params)
            rows = cursor.fetchall()

            trends = [
                {
                    "period": row["period"],
                    "play_count": row["play_count"],
                    "total_ms": row["total_ms"],
                }
                for row in rows
            ]

        return {
            "artist_name": artist_name,
            "track_name": track_name,
            "granularity": granularity,
            "start_date": start_date,
            "end_date": end_date,
            "data": trends,
        }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/health")
def health_check():
    """Check if the database is accessible and return basic stats."""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM songs")
            result = cursor.fetchone()

        return {"status": "healthy", "total_streams": result["count"]}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
