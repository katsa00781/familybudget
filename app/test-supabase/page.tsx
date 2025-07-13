'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testSupabaseConnection, testSupabaseSchema } from '@/lib/test-supabase';

export default function SupabaseTestPage() {
  const [testResults, setTestResults] = useState<{
    connection: boolean | null;
    schema: boolean | null;
    logs: string[];
  }>({
    connection: null,
    schema: null,
    logs: []
  });

  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string) => {
    setTestResults(prev => ({
      ...prev,
      logs: [...prev.logs, `${new Date().toLocaleTimeString()}: ${message}`]
    }));
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults({ connection: null, schema: null, logs: [] });
    
    addLog('🚀 Supabase tesztek futtatása kezdődik...');

    try {
      // Kapcsolat teszt
      addLog('🔍 Kapcsolat tesztelése...');
      const connectionResult = await testSupabaseConnection();
      setTestResults(prev => ({ ...prev, connection: connectionResult }));
      addLog(`Kapcsolat teszt: ${connectionResult ? '✅ Sikeres' : '❌ Sikertelen'}`);

      // Séma teszt (csak ha a kapcsolat sikeres)
      if (connectionResult) {
        addLog('🔍 Séma tesztelése...');
        const schemaResult = await testSupabaseSchema();
        setTestResults(prev => ({ ...prev, schema: schemaResult }));
        addLog(`Séma teszt: ${schemaResult ? '✅ Sikeres' : '❌ Sikertelen'}`);
      } else {
        addLog('⏭️ Séma teszt kihagyva (kapcsolat sikertelen)');
        setTestResults(prev => ({ ...prev, schema: false }));
      }

      addLog('🏁 Tesztek befejezve');
    } catch (error) {
      addLog(`❌ Teszt hiba: ${error}`);
      setTestResults(prev => ({ 
        ...prev, 
        connection: false, 
        schema: false 
      }));
    } finally {
      setIsRunning(false);
    }
  };

  const getResultIcon = (result: boolean | null) => {
    if (result === null) return '⏳';
    return result ? '✅' : '❌';
  };

  const getResultText = (result: boolean | null) => {
    if (result === null) return 'Várakozás...';
    return result ? 'Sikeres' : 'Sikertelen';
  };

  const getResultColor = (result: boolean | null) => {
    if (result === null) return 'text-gray-500';
    return result ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Supabase Kapcsolat Teszt</h1>
        <p className="text-gray-600">
          Ellenőrizzük, hogy a Supabase adatbázis kapcsolat megfelelően működik-e.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getResultIcon(testResults.connection)}
              Kapcsolat Teszt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-medium ${getResultColor(testResults.connection)}`}>
              {getResultText(testResults.connection)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Teszteli a Supabase kliens inicializálását és az alapvető kapcsolatot.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getResultIcon(testResults.schema)}
              Séma Teszt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-medium ${getResultColor(testResults.schema)}`}>
              {getResultText(testResults.schema)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Ellenőrzi az adatbázis sémát és a táblák elérhetőségét.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Teszt Futtatása</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="w-full md:w-auto"
          >
            {isRunning ? '🔄 Futtatás...' : '🚀 Tesztek Futtatása'}
          </Button>
        </CardContent>
      </Card>

      {testResults.logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Teszt Napló</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {testResults.logs.join('\n')}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Environment Információk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Supabase URL:</span>{' '}
              <span className="font-mono text-gray-600">
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? 
                  `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` : 
                  '❌ Nincs beállítva'
                }
              </span>
            </div>
            <div>
              <span className="font-medium">Anon Key:</span>{' '}
              <span className="font-mono text-gray-600">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
                  `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 
                  '❌ Nincs beállítva'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
