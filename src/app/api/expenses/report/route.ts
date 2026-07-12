import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// ── Types ─────────────────────────────────────────────────────────────────
type Item = { desc: string; amt: number };

interface DateRow {
  breakfast:     Item[];
  lunch:         Item[];
  evening_snack: Item[];
  dinner:        Item[];
  post_dinner:   Item[];
  transport:     Item[];
  other:         Item[];
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

function cell(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c });
}

function setCell(
  ws: XLSX.WorkSheet,
  r: number,
  c: number,
  v: string | number,
  s?: object,
) {
  ws[cell(r, c)] = {
    v,
    t: typeof v === 'number' ? 'n' : 's',
    ...(s ? { s } : {}),
  };
}

// ── Styles ────────────────────────────────────────────────────────────────
const border = {
  top:    { style: 'thin' },
  bottom: { style: 'thin' },
  left:   { style: 'thin' },
  right:  { style: 'thin' },
};
const boldBorder = {
  top:    { style: 'medium' },
  bottom: { style: 'medium' },
  left:   { style: 'thin' },
  right:  { style: 'thin' },
};

const HEADER1: object = {
  font:      { bold: true, name: 'Arial', sz: 10, color: { rgb: '000000' } },
  fill:      { fgColor: { rgb: 'BDD7EE' }, patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border,
};
const HEADER2: object = {
  font:      { bold: true, name: 'Arial', sz: 10 },
  fill:      { fgColor: { rgb: 'DEEAF1' }, patternType: 'solid' },
  alignment: { horizontal: 'center', vertical: 'center' },
  border,
};
const DATE_CELL: object = {
  font:      { name: 'Arial', sz: 10 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border,
};
const TEXT_CELL: object = {
  font:      { name: 'Arial', sz: 10 },
  alignment: { vertical: 'center' },
  border,
};
const NUM_CELL: object = {
  font:      { name: 'Arial', sz: 10 },
  numFmt:    '#,##0.##',
  alignment: { horizontal: 'right', vertical: 'center' },
  border,
};
const TOTAL_LBL: object = {
  font:      { bold: true, name: 'Arial', sz: 10 },
  fill:      { fgColor: { rgb: 'FFF2CC' }, patternType: 'solid' },
  alignment: { horizontal: 'center' },
  border: boldBorder,
};
const TOTAL_NUM: object = {
  font:      { bold: true, name: 'Arial', sz: 10 },
  fill:      { fgColor: { rgb: 'FFF2CC' }, patternType: 'solid' },
  numFmt:    '#,##0.##',
  alignment: { horizontal: 'right' },
  border: boldBorder,
};
const TOTAL_EMPTY: object = {
  fill:   { fgColor: { rgb: 'FFF2CC' }, patternType: 'solid' },
  border: boldBorder,
};

// ── Route handler ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to dates are required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // ── Fetch data ───────────────────────────────────────────────────────────
  const [mealsResult, othersResult] = await Promise.all([
    supabase
      .from('expense_meals')
      .select('*, expense_meal_items(*)')
      .eq('user_id', userData.id)
      .gte('expense_date', from)
      .lte('expense_date', to)
      .order('expense_date'),
    supabase
      .from('expense_others')
      .select('*')
      .eq('user_id', userData.id)
      .gte('expense_date', from)
      .lte('expense_date', to)
      .order('expense_date'),
  ]);

  const mealRows  = mealsResult.data  || [];
  const otherRows = othersResult.data || [];

  // ── Build per-date buckets ────────────────────────────────────────────────
  const dateMap = new Map<string, DateRow>();

  const getOrCreate = (date: string): DateRow => {
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        breakfast: [], lunch: [], evening_snack: [],
        dinner: [], post_dinner: [], transport: [], other: [],
      });
    }
    return dateMap.get(date)!;
  };

  for (const meal of mealRows) {
    const d = getOrCreate(meal.expense_date);
    const items = [...(meal.expense_meal_items || [])].sort(
      (a, b) => a.created_at.localeCompare(b.created_at),
    );
    const key = meal.meal_type as keyof DateRow;
    (d[key] as Item[]).push(...items.map((i: { description: string; amount: string | number }) => ({
      desc: i.description,
      amt:  Number(i.amount),
    })));
  }

  for (const o of otherRows) {
    const d = getOrCreate(o.expense_date);
    const item: Item = { desc: o.description || o.category, amt: Number(o.amount) };
    if (o.category === 'transport') {
      d.transport.push(item);
    } else {
      d.other.push(item);
    }
  }

  const sortedDates = Array.from(dateMap.keys()).sort();

  // ── Build worksheet ───────────────────────────────────────────────────────
  //
  //  Columns  A   B        C      D        E      F         G      H      I      J           K      L         M      N               O      P
  //           date bf_item bf_amt ln_item ln_amt eve_item eve_amt din_item din_amt pd_item pd_amt trav_item trav_amt other_item other_amt total
  //
  const ws: XLSX.WorkSheet = {};

  // ── Header row 0 ──────────────────────────────────────────────────────────
  setCell(ws, 0,  0, 'Date',               HEADER1);
  setCell(ws, 0,  1, 'Breakfast',          HEADER1);
  setCell(ws, 0,  3, 'Lunch',              HEADER1);
  setCell(ws, 0,  5, 'Evening Snack',      HEADER1);
  setCell(ws, 0,  7, 'Dinner',             HEADER1);
  setCell(ws, 0,  9, 'Post Dinner',        HEADER1);
  setCell(ws, 0, 11, 'Travel / Commute',   HEADER1);
  setCell(ws, 0, 13, 'Groceries & Other',  HEADER1);
  setCell(ws, 0, 15, 'Total',              HEADER1);

  // ── Header row 1 ──────────────────────────────────────────────────────────
  for (let c = 1; c <= 13; c += 2) {
    setCell(ws, 1, c,     'Item',   HEADER2);
    setCell(ws, 1, c + 1, 'Amount', HEADER2);
  }

  // ── Merges ────────────────────────────────────────────────────────────────
  ws['!merges'] = [
    { s: { r: 0, c:  0 }, e: { r: 1, c:  0 } }, // date
    { s: { r: 0, c:  1 }, e: { r: 0, c:  2 } }, // breakfast
    { s: { r: 0, c:  3 }, e: { r: 0, c:  4 } }, // lunch
    { s: { r: 0, c:  5 }, e: { r: 0, c:  6 } }, // evening snack
    { s: { r: 0, c:  7 }, e: { r: 0, c:  8 } }, // dinner
    { s: { r: 0, c:  9 }, e: { r: 0, c: 10 } }, // post dinner
    { s: { r: 0, c: 11 }, e: { r: 0, c: 12 } }, // travel
    { s: { r: 0, c: 13 }, e: { r: 0, c: 14 } }, // groceries & other
    { s: { r: 0, c: 15 }, e: { r: 1, c: 15 } }, // total
  ];

  // ── Data rows ─────────────────────────────────────────────────────────────
  let currentRow = 2;
  const colTotals = { bf: 0, ln: 0, ev: 0, dn: 0, pd: 0, tr: 0, ot: 0, grand: 0 };

  for (const date of sortedDates) {
    const d = dateMap.get(date)!;
    const numSlots = Math.max(
      d.breakfast.length,
      d.lunch.length,
      d.evening_snack.length,
      d.dinner.length,
      d.post_dinner.length,
      d.transport.length,
      d.other.length,
      1,
    );

    const dateStartRow = currentRow;

    for (let slot = 0; slot < numSlots; slot++) {
      const bf = d.breakfast[slot];
      const ln = d.lunch[slot];
      const ev = d.evening_snack[slot];
      const dn = d.dinner[slot];
      const pd = d.post_dinner[slot];
      const tr = d.transport[slot];
      const ot = d.other[slot];

      const rowTotal =
        (bf?.amt || 0) + (ln?.amt || 0) + (ev?.amt || 0) +
        (dn?.amt || 0) + (pd?.amt || 0) + (tr?.amt || 0) + (ot?.amt || 0);

      // Date (only written on first slot; cells merged below)
      if (slot === 0) setCell(ws, currentRow, 0, fmtDate(date), DATE_CELL);
      else            setCell(ws, currentRow, 0, '', TEXT_CELL);

      // Breakfast
      setCell(ws, currentRow,  1, bf?.desc || '', TEXT_CELL);
      bf?.amt
        ? (setCell(ws, currentRow,  2, bf.amt, NUM_CELL), (colTotals.bf += bf.amt))
        : setCell(ws, currentRow,  2, '', TEXT_CELL);

      // Lunch
      setCell(ws, currentRow,  3, ln?.desc || '', TEXT_CELL);
      ln?.amt
        ? (setCell(ws, currentRow,  4, ln.amt, NUM_CELL), (colTotals.ln += ln.amt))
        : setCell(ws, currentRow,  4, '', TEXT_CELL);

      // Evening snack
      setCell(ws, currentRow,  5, ev?.desc || '', TEXT_CELL);
      ev?.amt
        ? (setCell(ws, currentRow,  6, ev.amt, NUM_CELL), (colTotals.ev += ev.amt))
        : setCell(ws, currentRow,  6, '', TEXT_CELL);

      // Dinner
      setCell(ws, currentRow,  7, dn?.desc || '', TEXT_CELL);
      dn?.amt
        ? (setCell(ws, currentRow,  8, dn.amt, NUM_CELL), (colTotals.dn += dn.amt))
        : setCell(ws, currentRow,  8, '', TEXT_CELL);

      // Post dinner
      setCell(ws, currentRow,  9, pd?.desc || '', TEXT_CELL);
      pd?.amt
        ? (setCell(ws, currentRow, 10, pd.amt, NUM_CELL), (colTotals.pd += pd.amt))
        : setCell(ws, currentRow, 10, '', TEXT_CELL);

      // Travel / commute
      setCell(ws, currentRow, 11, tr?.desc || '', TEXT_CELL);
      tr?.amt
        ? (setCell(ws, currentRow, 12, tr.amt, NUM_CELL), (colTotals.tr += tr.amt))
        : setCell(ws, currentRow, 12, '', TEXT_CELL);

      // Groceries & other
      setCell(ws, currentRow, 13, ot?.desc || '', TEXT_CELL);
      ot?.amt
        ? (setCell(ws, currentRow, 14, ot.amt, NUM_CELL), (colTotals.ot += ot.amt))
        : setCell(ws, currentRow, 14, '', TEXT_CELL);

      // Row total
      if (rowTotal > 0) {
        setCell(ws, currentRow, 15, rowTotal, NUM_CELL);
        colTotals.grand += rowTotal;
      } else {
        setCell(ws, currentRow, 15, '', TEXT_CELL);
      }

      currentRow++;
    }

    // Merge date column across all slots for this date
    if (numSlots > 1) {
      ws['!merges']!.push({
        s: { r: dateStartRow, c: 0 },
        e: { r: currentRow - 1, c: 0 },
      });
    }
  }

  // ── Totals row ────────────────────────────────────────────────────────────
  setCell(ws, currentRow,  0, 'Total',          TOTAL_LBL);
  setCell(ws, currentRow,  1, '',               TOTAL_EMPTY);
  setCell(ws, currentRow,  2, colTotals.bf,     TOTAL_NUM);
  setCell(ws, currentRow,  3, '',               TOTAL_EMPTY);
  setCell(ws, currentRow,  4, colTotals.ln,     TOTAL_NUM);
  setCell(ws, currentRow,  5, '',               TOTAL_EMPTY);
  setCell(ws, currentRow,  6, colTotals.ev,     TOTAL_NUM);
  setCell(ws, currentRow,  7, '',               TOTAL_EMPTY);
  setCell(ws, currentRow,  8, colTotals.dn,     TOTAL_NUM);
  setCell(ws, currentRow,  9, '',               TOTAL_EMPTY);
  setCell(ws, currentRow, 10, colTotals.pd,     TOTAL_NUM);
  setCell(ws, currentRow, 11, '',               TOTAL_EMPTY);
  setCell(ws, currentRow, 12, colTotals.tr,     TOTAL_NUM);
  setCell(ws, currentRow, 13, '',               TOTAL_EMPTY);
  setCell(ws, currentRow, 14, colTotals.ot,     TOTAL_NUM);
  setCell(ws, currentRow, 15, colTotals.grand,  TOTAL_NUM);

  // ── Column widths ─────────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 10 }, // date
    { wch: 16 }, // bf item
    { wch:  9 }, // bf amount
    { wch: 16 }, // lunch item
    { wch:  9 }, // lunch amount
    { wch: 16 }, // eve item
    { wch:  9 }, // eve amount
    { wch: 16 }, // dinner item
    { wch:  9 }, // dinner amount
    { wch: 16 }, // pd item
    { wch:  9 }, // pd amount
    { wch: 16 }, // travel item
    { wch:  9 }, // travel amount
    { wch: 18 }, // other item
    { wch:  9 }, // other amount
    { wch: 10 }, // total
  ];

  // ── Row heights ───────────────────────────────────────────────────────────
  ws['!rows'] = [{ hpt: 28 }, { hpt: 18 }]; // header rows taller

  ws['!ref'] = XLSX.utils.encode_range(
    { r: 0, c: 0 },
    { r: currentRow, c: 15 },
  );

  // ── Assemble & return ─────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

  const buffer: Buffer = XLSX.write(wb, {
    type: 'buffer',
    bookType: 'xlsx',
    cellStyles: true,
  });

  const filename = `expenses-${from}-to-${to}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
