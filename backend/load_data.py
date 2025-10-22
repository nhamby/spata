"""
Data ingestion script for Spotify Extended Streaming History.
This script reads all JSON files from the data directory, processes them,
and loads them into a SQLite database with separate tables for songs, podcasts, and audiobooks.
"""

import json
import sqlite3
from pathlib import Path
import pandas as pd


def load_streaming_history():
    """Load and process all Spotify streaming history JSON files."""

    # Define paths
    project_root = Path(__file__).parent.parent
    data_dir_parent = project_root / "data"

    # Find the spotify_extended_streaming_history directory (supports any date suffix)
    data_dirs = list(data_dir_parent.glob("spotify_extended_streaming_history_*"))

    if not data_dirs:
        print(
            f"Error: No spotify_extended_streaming_history_* folder found in {data_dir_parent}"
        )
        print(
            "Please place your Spotify data in a folder named 'spotify_extended_streaming_history_*'"
        )
        return

    # Use the first (or only) matching directory
    data_dir = data_dirs[0]
    db_path = project_root / "backend" / "spotify.db"

    print(f"Looking for data in: {data_dir}")

    # Find all JSON files in the data directory
    json_files = list(data_dir.glob("Streaming_History_Audio_*.json"))

    if not json_files:
        print(f"No streaming history files found in {data_dir}")
        return

    print(f"Found {len(json_files)} streaming history files")

    # Read and combine all JSON files
    all_streams = []
    for json_file in sorted(json_files):
        print(f"Reading {json_file.name}...")
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            all_streams.extend(data)

    print(f"Total streams loaded: {len(all_streams)}")

    # Convert to DataFrame
    df = pd.DataFrame(all_streams)

    print("Processing data...")

    # Convert timestamp to datetime
    df["endTime"] = pd.to_datetime(df["ts"])

    # Ensure msPlayed is numeric
    df["msPlayed"] = pd.to_numeric(df["ms_played"], errors="coerce")

    # Filter out noise (streams less than 5 seconds)
    initial_count = len(df)
    df = df[df["msPlayed"] >= 5000]
    filtered_count = initial_count - len(df)
    print(f"Filtered out {filtered_count} streams with less than 5 seconds of playtime")

    # Separate into different content types based on URI fields
    print("\nSeparating content types...")

    # Songs: have spotify_track_uri
    df_songs = df[df["spotify_track_uri"].notna()].copy()
    df_songs["artistName"] = df_songs["master_metadata_album_artist_name"]
    df_songs["trackName"] = df_songs["master_metadata_track_name"]
    df_songs["albumName"] = df_songs["master_metadata_album_album_name"]
    df_songs["trackUri"] = df_songs["spotify_track_uri"]

    # Podcasts: have spotify_episode_uri
    df_podcasts = df[df["spotify_episode_uri"].notna()].copy()
    df_podcasts["showName"] = df_podcasts["episode_show_name"]
    df_podcasts["episodeName"] = df_podcasts["episode_name"]
    df_podcasts["episodeUri"] = df_podcasts["spotify_episode_uri"]

    # Audiobooks: have audiobook_uri
    df_audiobooks = df[df["audiobook_uri"].notna()].copy()
    df_audiobooks["bookTitle"] = df_audiobooks["audiobook_title"]
    df_audiobooks["chapterTitle"] = df_audiobooks["audiobook_chapter_title"]
    df_audiobooks["bookUri"] = df_audiobooks["audiobook_uri"]
    df_audiobooks["chapterUri"] = df_audiobooks["audiobook_chapter_uri"]

    print(f"  Songs: {len(df_songs)}")
    print(f"  Podcast episodes: {len(df_podcasts)}")
    print(f"  Audiobook chapters: {len(df_audiobooks)}")

    # Prepare songs table - only keeping songs with valid data
    df_songs_final = df_songs[
        ["endTime", "msPlayed", "artistName", "trackName", "albumName", "trackUri"]
    ].copy()
    df_songs_final = df_songs_final.dropna(subset=["endTime", "msPlayed", "trackName"])

    # Prepare podcasts table
    df_podcasts_final = df_podcasts[
        ["endTime", "msPlayed", "showName", "episodeName", "episodeUri"]
    ].copy()
    df_podcasts_final = df_podcasts_final.dropna(subset=["endTime", "msPlayed"])

    # Prepare audiobooks table
    df_audiobooks_final = df_audiobooks[
        ["endTime", "msPlayed", "bookTitle", "chapterTitle", "bookUri", "chapterUri"]
    ].copy()
    df_audiobooks_final = df_audiobooks_final.dropna(subset=["endTime", "msPlayed"])

    print(f"\nFinal counts after cleaning:")
    print(f"  Songs: {len(df_songs_final)}")
    print(f"  Podcast episodes: {len(df_podcasts_final)}")
    print(f"  Audiobook chapters: {len(df_audiobooks_final)}")

    # Save to SQLite
    print(f"\nSaving to database: {db_path}")
    conn = sqlite3.connect(db_path)

    # Drop existing tables if they exist
    conn.execute("DROP TABLE IF EXISTS streams")  # Legacy table
    conn.execute("DROP TABLE IF EXISTS songs")
    conn.execute("DROP TABLE IF EXISTS podcasts")
    conn.execute("DROP TABLE IF EXISTS audiobooks")

    # Save songs to database (main focus)
    df_songs_final.to_sql("songs", conn, if_exists="replace", index=False)

    # Create indexes for songs table
    conn.execute("CREATE INDEX IF NOT EXISTS idx_songs_endtime ON songs(endTime)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artistName)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_songs_track ON songs(trackName)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(albumName)")

    # Also keep the old "streams" table pointing to songs for backward compatibility
    df_songs_final[["endTime", "msPlayed", "artistName", "trackName"]].to_sql(
        "streams", conn, if_exists="replace", index=False
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_streams_endtime ON streams(endTime)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_streams_artist ON streams(artistName)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_streams_track ON streams(trackName)")

    # Save podcasts to database (for future use)
    if len(df_podcasts_final) > 0:
        df_podcasts_final.to_sql("podcasts", conn, if_exists="replace", index=False)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_podcasts_endtime ON podcasts(endTime)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_podcasts_show ON podcasts(showName)"
        )

    # Save audiobooks to database (for future use)
    if len(df_audiobooks_final) > 0:
        df_audiobooks_final.to_sql("audiobooks", conn, if_exists="replace", index=False)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audiobooks_endtime ON audiobooks(endTime)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audiobooks_book ON audiobooks(bookTitle)"
        )

    conn.commit()
    conn.close()

    print("\nData loading complete!")
    print(
        f"\nSongs date range: {df_songs_final['endTime'].min()} to {df_songs_final['endTime'].max()}"
    )
    if len(df_podcasts_final) > 0:
        print(
            f"Podcasts date range: {df_podcasts_final['endTime'].min()} to {df_podcasts_final['endTime'].max()}"
        )
    if len(df_audiobooks_final) > 0:
        print(
            f"Audiobooks date range: {df_audiobooks_final['endTime'].min()} to {df_audiobooks_final['endTime'].max()}"
        )


if __name__ == "__main__":
    load_streaming_history()
