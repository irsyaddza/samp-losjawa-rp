import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Helper to verify Admin Level >= 1
function isAuthorizedAdmin(adminLevel?: number): boolean {
  return typeof adminLevel === 'number' && adminLevel >= 1;
}

// Exact SA-MP gamemode genres & subgenres mapping
// Genre IDs in PAWN: 0=Rock, 1=Other, 2=Rhythm & Blues, 3=Urban, 4=Pop, 5=Oldies, 6=International, 7=Cultural, 8=Electronic, 9=Talk
const defaultRadioStations = [
  { genres_id: 8, subgenres_id: 3, station_name: 'Lofi Chill Beats 24/7', station_url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
  { genres_id: 4, subgenres_id: 0, station_name: 'Pop Hits & Top 40 Radio', station_url: 'https://stream.zeno.fm/0r0xa792kwzuv' },
  { genres_id: 3, subgenres_id: 1, station_name: 'Hip Hop & R&B Vibe', station_url: 'https://stream.zeno.fm/ya6q7422kwzuv' },
  { genres_id: 0, subgenres_id: 0, station_name: 'Indie & Alternative Rock', station_url: 'https://stream.zeno.fm/u2213m3752zuv' },
  { genres_id: 8, subgenres_id: 0, station_name: 'EDM & House Dance Beats', station_url: 'https://stream.zeno.fm/w864893752zuv' },
  { genres_id: 8, subgenres_id: 7, station_name: 'Retro Synthwave 80s', station_url: 'https://stream.zeno.fm/7cgg9am752zuv' },
  { genres_id: 5, subgenres_id: 0, station_name: 'Classics 80s & Oldies', station_url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
  { genres_id: 2, subgenres_id: 2, station_name: 'Soul & R&B Radio', station_url: 'https://stream.zeno.fm/t3q57422kwzuv' },
];

export async function GET() {
  const session = await getSession();
  if (!session || !isAuthorizedAdmin(session.adminLevel)) {
    return NextResponse.json({ error: 'Forbidden. Access restricted to Staff (Admin Level 1+).' }, { status: 403 });
  }

  try {
    // Ensure table radio_station exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS radio_station (
        id INT AUTO_INCREMENT PRIMARY KEY,
        genres_id INT NOT NULL DEFAULT 0,
        subgenres_id INT NOT NULL DEFAULT 0,
        station_name VARCHAR(64) NOT NULL,
        station_url VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    let [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, genres_id, subgenres_id, station_name, station_url FROM radio_station ORDER BY genres_id ASC, subgenres_id ASC, id ASC'
    );

    // Seed default stations if table is empty
    if (rows.length === 0) {
      for (const station of defaultRadioStations) {
        await pool.execute(
          'INSERT INTO radio_station (genres_id, subgenres_id, station_name, station_url) VALUES (?, ?, ?, ?)',
          [station.genres_id, station.subgenres_id, station.station_name, station.station_url]
        );
      }

      const [seededRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, genres_id, subgenres_id, station_name, station_url FROM radio_station ORDER BY genres_id ASC, subgenres_id ASC, id ASC'
      );
      rows = seededRows;
    }

    return NextResponse.json({ stations: rows });
  } catch (error) {
    console.error('Error fetching radio stations:', error);
    return NextResponse.json({ error: 'Failed to fetch radio stations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isAuthorizedAdmin(session.adminLevel)) {
    return NextResponse.json({ error: 'Forbidden. Access restricted to Staff (Admin Level 1+).' }, { status: 403 });
  }

  try {
    const { action, id, genres_id, subgenres_id, station_name, station_url } = await req.json();

    // 1. ADD RADIO STATION
    if (action === 'add') {
      if (!station_name || !station_url) {
        return NextResponse.json({ error: 'Please enter a valid station name and stream URL.' }, { status: 400 });
      }

      const name = station_name.trim();
      const url = station_url.trim();
      const genreId = typeof genres_id === 'number' ? genres_id : parseInt(genres_id, 10) || 0;
      const subgenreId = typeof subgenres_id === 'number' ? subgenres_id : parseInt(subgenres_id, 10) || 0;

      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO radio_station (genres_id, subgenres_id, station_name, station_url) VALUES (?, ?, ?, ?)',
        [genreId, subgenreId, name, url]
      );

      return NextResponse.json({
        success: true,
        message: `Successfully added radio station "${name}" (ID #${result.insertId}).`,
      });
    }

    // 2. EDIT RADIO STATION
    if (action === 'edit') {
      if (!id || !station_name || !station_url) {
        return NextResponse.json({ error: 'Invalid station data for editing.' }, { status: 400 });
      }

      const stationId = parseInt(id, 10);
      const name = station_name.trim();
      const url = station_url.trim();
      const genreId = typeof genres_id === 'number' ? genres_id : parseInt(genres_id, 10) || 0;
      const subgenreId = typeof subgenres_id === 'number' ? subgenres_id : parseInt(subgenres_id, 10) || 0;

      await pool.execute<ResultSetHeader>(
        'UPDATE radio_station SET genres_id = ?, subgenres_id = ?, station_name = ?, station_url = ? WHERE id = ?',
        [genreId, subgenreId, name, url, stationId]
      );

      return NextResponse.json({
        success: true,
        message: `Successfully updated radio station "${name}".`,
      });
    }

    // 3. DELETE RADIO STATION
    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ error: 'Invalid radio station ID.' }, { status: 400 });
      }

      const stationId = parseInt(id, 10);

      await pool.execute<ResultSetHeader>(
        'DELETE FROM radio_station WHERE id = ?',
        [stationId]
      );

      return NextResponse.json({
        success: true,
        message: `Successfully deleted radio station ID #${stationId}.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in radio station management API:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
