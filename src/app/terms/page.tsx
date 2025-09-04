'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link 
            href="/" 
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Înapoi la pagina principală</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Terms and Conditions
          </h1>
          
          <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed">
            <h2 className="text-2xl font-semibold mb-4">Procesul de cumpărare</h2>
            <p className="mb-4">– Biletele pot fi achitate cu cardul Visa sau Mastercard pe site-ul evenimentului prin intermediul companiei licențiate la nivel național BC "MAIB" SA.</p>
            <p className="mb-4">– Plata este acceptată în favoarea „ARTA ȘI CULTURA EVENIMENTULUI" A.O.</p>
            <p className="mb-4">– În procesul de achitare pot apărea taxe de procesare, fiți atenți la informația afișată pe ecran în procesul procurării.</p>
            
            <h2 className="text-2xl font-semibold mb-4 mt-8">Despre bilete</h2>
            <p className="mb-4">– Prestatorul nu poartă răspundere pentru pierderea, deteriorarea sau multiplicarea biletelor.</p>
            <p className="mb-4">– Fiecare utilizator răspunde individual pentru siguranța biletelor personale.</p>
            <p className="mb-4">– Cumpăratorului nu îi este permis să vândă sau să înstrăineze biletul cumpărat de la prestator către o terță parte în scopul obținerii de avantaje materiale sau în scop promoțional. Organizatorul evenimentului poate refuză participarea deținătorilor unor astfel de bilete la eveniment sau îi poate evacua din locație.</p>
            <p className="mb-4">– Prestatorul nu își asumă răspunderea pentru eventualele întârzieri, amânări sau anulări ale evenimentului pentru care au fost cumpărate biletele și restricționări impuse de organizator sau de instituții ale statului (privind numărul de bilete ce pot fi cumpărate de o persoană sau persoane individuale supuse unor restricționări legale, alte restricționări), cumpărătorii trebuind să se adreseze organizatorului evenimentului pentru eventualele pretenții.</p>
            
            <h2 className="text-2xl font-semibold mb-4 mt-8">Procesul de returnare</h2>
            <p className="mb-4">– După achiziționare, biletele la voievod nu pot fi returnate sau schimbate, cu excepția cazurilor prevăzute de legislația Republicii Moldova, cum ar fi anularea sau amânarea evenimentului din vina organizatorului.</p>
            <p className="mb-4">– Organizatorii își rezervă dreptul de-a refuza returnarea biletelor din motive particulare, după cum urmează:</p>
            <p className="mb-4"><strong>Modificări în programul voievod:</strong> Modificarea sau înlocuirea artiștilor, a orelor de spectacole și a altor aspecte ale programului nu constituie motive pentru rambursarea biletului, dacă evenimentul are loc în ansamblu.</p>
            <p className="mb-4"><strong>Amânarea voievod:</strong> În cazul amânării datei voievod, biletele rămân valabile pentru noua dată. Rambursarea biletelor în acest caz nu se efectuează, dacă noua dată a fost anunțată în prealabil și respectă cerințele legislației.</p>
            <p className="mb-4"><strong>Renunțarea la participare:</strong> Dacă participantul decide din motive personale să renunțe la participarea la voievod, rambursarea biletelor nu este posibilă.</p>
            <p className="mb-4"><strong>Forță majoră:</strong> Rambursarea biletelor nu se efectuează în caz de anulare sau amânare a evenimentului din motive independente de organizatori (de exemplu, calamități naturale, pandemii, situații de urgență), în conformitate cu condițiile contractului de vânzare-cumpărare și prevederile legislației civile a Republicii Moldova.</p>
            <p className="mb-4"><strong>Cazuri speciale:</strong> În conformitate cu legislația Republicii Moldova, rambursarea biletului poate fi efectuată în cazuri justificate, cum ar fi motive medicale grave, confirmate prin documente corespunzătoare.</p>
            
            <h2 className="text-2xl font-semibold mb-4 mt-8">Important!</h2>
            <p className="mb-4">– Biletele pentru evenimentele programate pot fi păstrate și sunt active pentru noile dăți când evenimentele vor avea loc.</p>
            <p className="mb-4">– Returnarea banilor pentru bilete în numerar către posesor, are loc cu reținerea unui comision, ce variază între 12%, în dependență de evenimentul programat.</p>
            <p className="mb-4">– Pentru evenimentele anulate banii se întorc către posesor, cu comision 0%, excepție făcând plățile prin terminalele de plată și biletele fizice la care se reține un comision de 5%.</p>
            
            <h2 className="text-2xl font-semibold mb-4 mt-8">Taxa de administrare</h2>
            <p className="mb-4">Prestatorul poate percepe taxe de administrare a comenzilor. Ele variază între 3 și 50 lei în dependență de suma comenzilor.</p>
            <p className="mb-4">Aceste taxe sunt afișate după rezervarea biletelor la etapa finală a efectuării comenzii.</p>
            
            <h2 className="text-2xl font-semibold mb-4 mt-8">Confidențialitate</h2>
            <p className="mb-4">– Prestatorul nu împarte datele cu caracter personal altor persoane sau companii decât celor implicate nemijlocit în procesul de achitare.</p>
            
            <h2 className="text-2xl font-semibold mb-4 mt-8">Informații juridice</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="mb-2"><strong>Denumirea juridică a companiei:</strong> AO Arta si Cultura Evenimentului</p>
              <p className="mb-2"><strong>IDNO:</strong> 1016620000675</p>
              <p className="mb-2"><strong>Adresa juridică:</strong> str. Tighina 49/4, of. A</p>
              <p className="mb-2"><strong>Telefon de contact:</strong> +373 796 60 101</p>
              <p className="mb-2"><strong>Email de contact:</strong> inna@mediashowgrup.com</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}