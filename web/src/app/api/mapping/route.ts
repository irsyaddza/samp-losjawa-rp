import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Simple blacklist of forbidden objects (e.g. dynamic fires, massive objects, faction gates)
const BLACKLIST_OBJECT_IDS = [
  18688, 18689, 18690, // Fires
  18693, // Huge chimney smoke
  19632, 19633, // Invisible platforms/glitch walls
];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, property_type, property_id, status, admin_note, created_at, custom_title FROM property_mappings WHERE ucp_name = ? ORDER BY created_at DESC',
      [session.username]
    );

    return NextResponse.json({ requests: rows });
  } catch (error) {
    console.error('Error fetching mappings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Check donator rank (must be at least level 2 - Silver)
    const [accounts] = await pool.execute<RowDataPacket[]>(
      'SELECT DonateRank FROM accounts WHERE Username = ? LIMIT 1',
      [session.username]
    );

    if (accounts.length === 0 || accounts[0].DonateRank < 2) {
      return NextResponse.json(
        { error: 'Hanya donatur dengan tingkat minimal Silver yang dapat mengajukan mapping properti.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { propertyType, propertyId, mappingCode, customTitle } = body;

    if (!propertyType || !mappingCode) {
      return NextResponse.json({ error: 'Data form tidak lengkap.' }, { status: 400 });
    }

    const typeNum = parseInt(propertyType); // 1 = House, 2 = Biz, 3 = Apartment, 4 = Custom
    const idNum = typeNum === 4 ? 0 : parseInt(propertyId);

    // 2. Validate ownership based on property type
    let isOwner = false;
    if (typeNum === 1) {
      // House check
      const [houses] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM houses WHERE id = ? AND ownerSQLID IN (SELECT ID FROM characters WHERE master = ?) LIMIT 1',
        [idNum, session.userId]
      );
      isOwner = houses.length > 0;
    } else if (typeNum === 2) {
      // Business check
      const [bizs] = await pool.execute<RowDataPacket[]>(
        'SELECT biz_id FROM business WHERE biz_id = ? AND biz_owner IN (SELECT char_name FROM characters WHERE master = ?) LIMIT 1',
        [idNum, session.userId]
      );
      isOwner = bizs.length > 0;
    } else if (typeNum === 3) {
      // Apartment check
      const [apts] = await pool.execute<RowDataPacket[]>(
        'SELECT ID FROM apartments WHERE ID = ? AND ownerSQLID IN (SELECT ID FROM characters WHERE master = ?) LIMIT 1',
        [idNum, session.userId]
      );
      isOwner = apts.length > 0;
    } else if (typeNum === 4) {
      isOwner = true; // Custom mapping bypasses ownership check
    }

    if (!isOwner) {
      return NextResponse.json({ error: 'Anda tidak memiliki properti ini.' }, { status: 400 });
    }

    // 3. Check for existing PENDING request
    let pendingExists = false;
    if (typeNum === 4) {
      const [pending] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM property_mappings WHERE property_type = 4 AND custom_title = ? AND status = 0 LIMIT 1',
        [customTitle || '']
      );
      pendingExists = pending.length > 0;
    } else {
      const [pending] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM property_mappings WHERE property_type = ? AND property_id = ? AND status = 0 LIMIT 1',
        [typeNum, idNum]
      );
      pendingExists = pending.length > 0;
    }

    if (pendingExists) {
      return NextResponse.json(
        { error: 'Properti/Mapping ini sudah memiliki request mapping berstatus PENDING. Mohon tunggu tinjauan admin.' },
        { status: 400 }
      );
    }

    // 4. Parse mapping code (extract valid CreateDynamicObject/CreateObject and SetDynamicObjectMaterial/SetObjectMaterial lines)
    const lines = mappingCode.split('\n');
    const parsedLines: string[] = [];
    const createObjRegex = /(CreateDynamicObject|CreateObject)\s*\(\s*\d+\s*,\s*[-+]?[0-9]*\.?[0-9]+\s*,\s*[-+]?[0-9]*\.?[0-9]+\s*,\s*[-+]?[0-9]*\.?[0-9]+/i;
    const materialRegex = /(SetDynamicObjectMaterialText|SetObjectMaterialText|SetDynamicObjectMaterial|SetObjectMaterial)\s*\(/i;

    for (const line of lines) {
      if (createObjRegex.test(line) || materialRegex.test(line)) {
        parsedLines.push(line.trim());
      }
    }

    if (parsedLines.length === 0) {
      return NextResponse.json(
        { error: 'Format kode mapping tidak valid. Harap gunakan format CreateDynamicObject atau CreateObject.' },
        { status: 400 }
      );
    }

    // 5. Check blacklist object IDs
    for (const line of parsedLines) {
      if (materialRegex.test(line)) {
        continue; // Skip material edits from blacklist checks
      }
      const match = line.match(/\(\s*(\d+)/);
      if (match) {
        const modelId = parseInt(match[1]);
        if (BLACKLIST_OBJECT_IDS.includes(modelId)) {
          return NextResponse.json(
            { error: `Penerbitan mapping ditolak karena menggunakan Object ID terlarang: ${modelId}` },
            { status: 400 }
          );
        }
      }
    }

    const cleanMappingCode = parsedLines.join('\n');

    // 6. Save request to database
    await pool.execute<ResultSetHeader>(
      'INSERT INTO property_mappings (ucp_name, property_type, property_id, mapping_code, status, custom_title) VALUES (?, ?, ?, ?, 0, ?)',
      [session.username, typeNum, idNum, cleanMappingCode, typeNum === 4 ? (customTitle || 'Kustom') : null]
    );

    return NextResponse.json({ success: true, message: 'Request mapping berhasil diajukan.' });
  } catch (error) {
    console.error('Error submitting mapping request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
