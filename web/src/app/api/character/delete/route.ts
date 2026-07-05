import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { charId } = await request.json();
    if (!charId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 });
    }

    // 1. Fetch character details to verify ownership and online status
    const [chars] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, char_name, master, Online FROM characters WHERE ID = ? LIMIT 1',
      [charId]
    );

    if (chars.length === 0) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const character = chars[0];

    // Verify ownership
    if (character.master !== session.userId) {
      return NextResponse.json({ error: 'You do not own this character' }, { status: 403 });
    }

    // Verify online status - players must log out of the game before deleting!
    if (character.Online === 1) {
      return NextResponse.json(
        { error: 'Karakter sedang online di dalam game. Silakan keluar dari game terlebih dahulu!' },
        { status: 400 }
      );
    }

    const charName = character.char_name;

    // Get a connection from pool for executing all cleanup queries
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 2. Reset owned houses to default 'The State' unowned status
      await conn.execute(
        "UPDATE houses SET ownerSQLID = -1, owner = 'The State', owned = 0, locked = 1 WHERE ownerSQLID = ?",
        [charId]
      );

      // 3. Reset owned apartments
      await conn.execute(
        "UPDATE apartments SET ownerSQLID = -1, owner = 'The State', owned = 0, locked = 1 WHERE ownerSQLID = ?",
        [charId]
      );

      // 4. Reset owned businesses
      await conn.execute(
        "UPDATE business SET biz_owner = 'The State', biz_owned = 0, biz_locked = 1, biz_till = 0, biz_encost = 0 WHERE biz_owner = ?",
        [charName]
      );

      // 5. Delete owned vehicles
      await conn.execute(
        'DELETE FROM cars WHERE carOwner = ?',
        [charId]
      );

      // 6. Delete the character record itself
      await conn.execute(
        'DELETE FROM characters WHERE ID = ?',
        [charId]
      );

      await conn.commit();
      return NextResponse.json({ success: true, message: 'Character deleted successfully' });
    } catch (dbError) {
      await conn.rollback();
      throw dbError;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error('Delete character error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
