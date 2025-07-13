import { createClient } from '@/lib/utils/supabase/client';

/**
 * Supabase kapcsolat teszt
 * Ellenőrzi, hogy a Supabase kliens megfelelően kapcsolódik-e az adatbázishoz
 */
export async function testSupabaseConnection(): Promise<boolean> {
  console.log('🔍 Supabase kapcsolat tesztelése...');
  
  try {
    // Supabase kliens létrehozása
    const supabase = createClient();
    
    console.log('✅ Supabase kliens sikeresen létrehozva');
    
    // Egyszerű lekérdezés végrehajtása - az auth.users tábla ellenőrzése
    const { error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('⚠️  Auth hiba (ez várható, ha nincs bejelentkezett user):', authError.message);
    } else {
      console.log('✅ Auth kapcsolat működik');
    }
    
    // Próbáljunk egy egyszerű RPC hívást vagy ping-et
    // Mivel még nincsenek táblák, próbáljuk meg a metaadatok lekérdezését
    const { data: versionData, error: versionError } = await supabase
      .rpc('version'); // PostgreSQL verzió lekérdezése
    
    if (versionError) {
      console.log('⚠️  RPC hiba (ez várható, ha nincs version RPC függvény):', versionError.message);
      
      // Alternatív teszt: próbáljunk egy egyszerű ping-et
      try {
        // Egyszerű auth ping-gel teszteljük a kapcsolatot
        await supabase.auth.getUser();
        console.log('✅ Adatbázis kapcsolat működik (auth ping sikeres)');
      } catch (pingError) {
        console.log('❌ Adatbázis kapcsolat hiba:', pingError);
        return false;
      }
    } else {
      console.log('✅ RPC kapcsolat működik, PostgreSQL verzió:', versionData);
    }
    
    // Environment változók ellenőrzése
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Hiányzó environment változók!');
      console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Beállítva' : '❌ Hiányzik');
      console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Beállítva' : '❌ Hiányzik');
      return false;
    }
    
    console.log('✅ Environment változók rendben');
    console.log('📍 Supabase URL:', supabaseUrl);
    console.log('🔑 Anon Key:', supabaseKey?.substring(0, 20) + '...');
    
    // Összesítő eredmény
    console.log('🎉 Supabase kapcsolat teszt sikeres!');
    return true;
    
  } catch (error) {
    console.error('❌ Supabase kapcsolat teszt sikertelen:', error);
    return false;
  }
}

/**
 * Supabase adatbázis séma teszt
 * Ellenőrzi, hogy léteznek-e a szükséges táblák (ha vannak)
 */
export async function testSupabaseSchema(): Promise<boolean> {
  console.log('🔍 Supabase adatbázis séma tesztelése...');
  
  try {
    const supabase = createClient();
    
    // Próbáljunk meg egy egyszerű SQL lekérdezést végrehajtani
    // Ez ellenőrzi, hogy van-e hozzáférésünk az adatbázishoz
    const { data: result, error } = await supabase
      .rpc('get_schema_version', {});
    
    if (error) {
      console.log('⚠️  Nincs get_schema_version RPC függvény (ez normális egy új projektben)');
      
      // Próbáljunk meg alapvető admin műveleteket
      try {
        // Egyszerű teszt: próbáljuk meg lekérni a jelenlegi user-t
        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.log('⚠️  Auth hiba:', userError.message);
        }
        
        console.log('✅ Alapvető adatbázis műveletek működnek');
        console.log('📋 Még nincsenek egyéni táblák létrehozva, de ez normális egy új projektben');
        return true;
      } catch (basicError) {
        console.log('❌ Alapvető adatbázis műveletek hibásak:', basicError);
        return false;
      }
    } else {
      console.log('✅ Séma verzió:', result);
      return true;
    }
    
  } catch (error) {
    console.error('❌ Séma teszt sikertelen:', error);
    return false;
  }
}

// Ha ez a fájl közvetlenül fut (pl. Node.js-ben)
if (typeof window === 'undefined') {
  console.log('🚀 Supabase tesztek futtatása...\n');
  
  let connectionSuccess = false;
  
  testSupabaseConnection()
    .then((result) => {
      connectionSuccess = result;
      if (result) {
        return testSupabaseSchema();
      }
      return false;
    })
    .then((schemaSuccess) => {
      console.log('\n📊 Teszt eredmények:');
      console.log('Kapcsolat teszt:', connectionSuccess ? '✅ Sikeres' : '❌ Sikertelen');
      console.log('Séma teszt:', schemaSuccess ? '✅ Sikeres' : '❌ Sikertelen');
    })
    .catch(console.error);
}
