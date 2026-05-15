import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { budgetComparisonHandler } from './tools/budget-comparison.js'
import { savePriceHistoryHandler, getPriceChangesHandler } from './tools/price-history.js'
import { getInflationReportHandler } from './tools/inflation.js'
import { getProductsHandler } from './tools/products.js'
import { getShoppingStatisticsHandler } from './tools/shopping-statistics.js'

const server = new McpServer({
  name: 'familybudget',
  version: '1.0.0'
})

server.tool(
  'budget_comparison',
  'Összehasonlítja az aktív havi költségvetési tervet a Wallet tranzakciókkal. ' +
  'Első lépés: hívd a Wallet MCP get_records eszközét a tranzakciókért, majd add át wallet_records-ban. ' +
  'A type mező értéke "Kiadás" (vagy "expense"), "Bevétel" (vagy "income"), "Átvezetés" (vagy "transfer").',
  {
    month: z.string().describe('Hónap YYYY-MM formátumban, pl. "2026-05"'),
    wallet_records: z.array(z.object({
      date: z.string().describe('YYYY-MM-DD'),
      category: z.string().describe('Wallet kategória neve magyarul'),
      amount: z.number().describe('Összeg — kiadásoknál is pozitív szám'),
      type: z.string().describe('"Kiadás" vagy "expense" | "Bevétel" vagy "income" | "Átvezetés" vagy "transfer"'),
      note: z.string().optional(),
      payee: z.string().optional(),
      account: z.string().optional()
    })).describe('Wallet tranzakciók a Wallet MCP get_records-ból')
  },
  budgetComparisonHandler
)

server.tool(
  'save_price_history',
  'Termék árát menti a product_price_history táblába. ' +
  'Használható OCR blokk feldolgozás után (source: "ocr") vagy manuálisan (source: "manual").',
  {
    product_name: z.string().describe('Termék neve'),
    unit_price: z.number().describe('Egységár forintban'),
    product_category: z.string().optional().describe('Termék kategóriája, pl. "Élelmiszer"'),
    store_name: z.string().optional().describe('Bolt neve, pl. "Lidl"'),
    unit: z.string().optional().describe('Mértékegység — default: "db"'),
    quantity: z.number().optional().describe('Mennyiség — default: 1'),
    price_date: z.string().optional().describe('Dátum YYYY-MM-DD formátumban — default: mai nap'),
    source: z.enum(['ocr', 'manual']).optional().describe('Adat forrása — default: "manual"')
  },
  savePriceHistoryHandler
)

server.tool(
  'get_price_changes',
  'Legutóbbi árváltozások lekérése termékenként. ' +
  'Ugyanaz az adatforrás, mint az /arfigyeles oldal. ' +
  'Visszaadja a termékeket, ahol az ár több mint 1%-ot változott.',
  {
    days_back: z.number().optional().describe('Hány napra visszamenőleg — default: 30')
  },
  getPriceChangesHandler
)

server.tool(
  'get_inflation_report',
  'Havi inflációs trendek lekérése kategóriánként. ' +
  'Ugyanaz az adatforrás, mint az /inflacio oldal.',
  {
    months_back: z.number().optional().describe('Hány hónapra visszamenőleg — default: 12')
  },
  getInflationReportHandler
)

server.tool(
  'get_products',
  'Termékadatbázis lekérése. Szűrhető kategória, bolt, névkeresés és elérhetőség szerint. ' +
  'Ugyanaz az adatforrás, mint a /termekek oldal.',
  {
    category: z.string().optional().describe('Kategória szűrő, pl. "Tejtermékek", "Pékáruk", "Húsok"'),
    store_name: z.string().optional().describe('Bolt neve szerinti szűrő, pl. "Lidl", "Tesco"'),
    search: z.string().optional().describe('Névrészlet szerinti keresés (kis-nagybetű érzéketlen)'),
    available_only: z.boolean().optional().describe('Csak elérhető termékek — default: false'),
    limit: z.number().optional().describe('Max visszaadott rekordok száma — default: 200')
  },
  getProductsHandler
)

server.tool(
  'get_shopping_statistics',
  'Bevásárlási statisztikák lekérése a shopping_statistics táblából. ' +
  'Ugyanaz az adatforrás, mint a /statisztika oldal vásárlási összesítői. ' +
  'Visszaad összesítőket idő, termék, kategória és bolt szerint.',
  {
    start_date: z.string().optional().describe('Kezdő dátum YYYY-MM-DD formátumban'),
    end_date: z.string().optional().describe('Záró dátum YYYY-MM-DD formátumban'),
    group_by: z.enum(['day', 'week', 'month']).optional().describe('Időbeli csoportosítás — default: "month"')
  },
  getShoppingStatisticsHandler
)

const transport = new StdioServerTransport()
await server.connect(transport)
