"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { 
  Users, 
  UserPlus, 
  Mail, 
  MessageCircle, 
  CheckCircle, 
  AlertCircle,
  Info,
  ArrowRight,
  Copy
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';

export default function SegitsegPage() {
  const steps = [
    {
      id: 1,
      title: "Menj a Profil oldalra",
      description: "Kattints a sidebar-ban a 'Profil' menüpontra",
      icon: <Users className="w-5 h-5" />,
      color: "bg-blue-100 text-blue-600"
    },
    {
      id: 2,
      title: "Keresd meg a Családtagok szekciót",
      description: "Az oldal alján találod a 'Család tagjai' kártyát",
      icon: <UserPlus className="w-5 h-5" />,
      color: "bg-green-100 text-green-600"
    },
    {
      id: 3,
      title: "Kattints a 'Családtag hozzáadása' gombra",
      description: "Ez megnyitja a meghívási dialógust",
      icon: <Mail className="w-5 h-5" />,
      color: "bg-purple-100 text-purple-600"
    },
    {
      id: 4,
      title: "Add meg az email címet",
      description: "Írd be a meghívni kívánt személy email címét",
      icon: <MessageCircle className="w-5 h-5" />,
      color: "bg-orange-100 text-orange-600"
    },
    {
      id: 5,
      title: "Küldd el a meghívót",
      description: "A rendszer automatikusan létrehozza a meghívó linket",
      icon: <CheckCircle className="w-5 h-5" />,
      color: "bg-cyan-100 text-cyan-600"
    }
  ];

  const faqs = [
    {
      question: "Mi történik, ha a meghívott személy még nincs regisztrálva?",
      answer: "Ha a személy még nem regisztrált az alkalmazásban, egy meghívó linket kap, amit át tudsz neki küldeni. A link segítségével be tud jelentkezni vagy regisztrálni, majd automatikusan csatlakozik a családodhoz."
    },
    {
      question: "Hányan lehetnek egy családban?",
      answer: "Jelenleg nincs limit a családtagok számára. Bármennyien csatlakozhatnak a családi költségvetés kezeléséhez."
    },
    {
      question: "Hogyan tudom eltávolítani egy családtagot?",
      answer: "Jelenleg ez a funkció fejlesztés alatt áll. Későbbi frissítésben lesz elérhető a családtagok kezelése és eltávolítása."
    },
    {
      question: "Mit láthatnak a családtagok?",
      answer: "A családtagok hozzáférnek a közös költségvetéshez, bevásárló listákhoz, bevételi tervekhez és megtakarítási célokhoz. Minden adat megosztott a család tagjai között."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-green-50 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-4">
            Segítség & Útmutató
          </h1>
          <p className="text-gray-600 text-lg">
            Itt mindent megtudhatsz az alkalmazás használatáról
          </p>
        </div>

        {/* Családtagok hozzáadása */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              Családtagok hozzáadása
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 mb-1">Fontos tudnivaló</h3>
                    <p className="text-sm text-blue-700">
                      A családtagok hozzáadásával megoszthatod velük a költségvetést, bevásárló listákat és pénzügyi terveket.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-4">Lépések:</h3>
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full ${step.color} flex items-center justify-center flex-shrink-0`}>
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {step.id}. {step.title}
                      </h4>
                      <p className="text-gray-600 text-sm">
                        {step.description}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-gray-400 mt-3" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gyakori kérdések */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              Gyakori kérdések
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                  <h3 className="font-medium text-gray-900 mb-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                    {faq.question}
                  </h3>
                  <p className="text-gray-600 text-sm ml-6">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gyorsindítás */}
        <Card>
          <CardHeader>
            <CardTitle>Gyors műveletek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                className="h-auto p-4 justify-start"
                variant="outline"
                onClick={() => window.location.href = '/profil'}
              >
                <Users className="w-5 h-5 mr-3 text-cyan-600" />
                <div className="text-left">
                  <div className="font-medium">Családtagok kezelése</div>
                  <div className="text-xs text-gray-500">Ugrás a profil oldalra</div>
                </div>
              </Button>
              
              <Button 
                className="h-auto p-4 justify-start"
                variant="outline"
                onClick={() => window.location.href = '/koltsegvetes'}
              >
                <Copy className="w-5 h-5 mr-3 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Költségvetés</div>
                  <div className="text-xs text-gray-500">Családi büdzsé kezelése</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
