'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          
          <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed">
            <p className="mb-4">https://voievodul.md/ este reprezentat de către „ARTA SI CULTURA EVENIMENTULUI" A.O.</p>
            
            <p className="mb-4">În timp ce navigați pe website-ul voievodul.md ne furnizați 2 tipuri de informație: informația personală pe care o furnizați la momentul efectuării cumpărăturilor (atunci, când indicați datele personale despre numele, prenumele, adresa, numărul de telefon etc.) și informația despre utilizarea site-ului nostru în timp ce navigați pe el (informația se culege în regimul independent cu ajutorul instrumentelor noastre de analizare.)</p>
            
            <p className="mb-4">„ARTA SI CULTURA EVENIMENTULUI" A.O. prelucrează datele cu caracter personal din contul utilizatorului online de pe website-ul https://voievodul.md/ conform principiilor, regulilor și prevederilor descrise ulterior. „ARTA SI CULTURA EVENIMENTULUI" A.O. nu dezvăluie terților persoane, datele personale introduse pe site.</p>
            
            <h2 className="text-2xl font-semibold mb-4 mt-8">Informația personală</h2>
            <p className="mb-4">https://voievodul.md/ nu va transmite informația furnizată de dvs. către terți. Datele dvs. se vor păstra confidențial și nu sunt supuse vânzării sau schimbului.</p>
            
            <h2 className="text-2xl font-semibold mb-4 mt-8">Informația despre utilizarea website-ului</h2>
            <p className="mb-4">La fel ca și alte site-uri comerciale, site-ul https://voievodul.md/ utilizează jurnale web pentru a colecta informații despre modul în care site-ul nostru este utilizat. Informațiile colectate prin cookie-uri și jurnalele serverului web pot include data și ora vizitelor, paginile vizualizate, timpul petrecut pe site-ul nostru și site-urile vizitate chiar înainte și după site-ul nostru. Aceste informații sunt colectate în mod cumulativ. Niciuna dintre aceste informații nu este asociată cu dvs. fie ca persoană fizică, fie ca utilizator individual.</p>
            
            <h2 className="text-2xl font-semibold mb-4 mt-8">Ce prezintă fișiere Cookies?</h2>
            <p className="mb-4">Fișiere cookies sunt fișierele mici, ce se păstrează în memoria calculatorului dvs. în timp ce navigați pe website-ul nostru. Cu ajutorul informației care se depozitează în aceste fișiere cookies site-ul nostru memorizează preferințele dvs. când vă întoarceți pe web-site. Astfel site-ul se adaptează mai bine nevoilor dvs.Dacă doriți să deconectați fișierele cookies puteți să modificați setările browser-ului dvs. Dar vă aducem la cunoștință, că aceasta poate dăuna funcționării corecte a unor părți importante a website-ului nostru. Aceasta poate dăuna la fel și furnizării serviciilor noastre.</p>
            
            <h2 className="text-2xl font-semibold mb-4 mt-8">Utilizarea informației de pe web-site</h2>
            <p className="mb-4">Conținutul acestui site poate fi utilizat de dvs. doar în scopuri personale, informative și/sau necomerciale și nu poate fi modificat de dvs. în nici un fel. Cu excepția cazurilor menționate direct în acest document, nu aveți dreptul să utilizați, să încărcați, să publicați, să copiați, să tipăriți, să afișați, să efectuați, să reproduceți, să licențiați, să transmiteți sau să distribuiți toate informațiile din acest site integral sau parțial fără consimțământul prealabil scris al site-ului https://voievodul.md/</p>
            
            <h2 className="text-2xl font-semibold mb-4 mt-8">Accord</h2>
            <p className="mb-4">Prin utilizarea site-ului https://voievodul.md/ sunteți de acord în mod automat cu colectarea și utilizarea informațiilor personale, așa cum este descris în această politică de confidențialitate. Dacă ne schimbăm politicile și procedurile de confidențialitate, vom posta aceste modificări pe site-ul nostru, astfel încât să știți ce informații colectăm, cum le folosim și în ce circumstanțe le putem dezvălui. Dacă nu sunteți de acord cu aceste modificări, singurul remediu este să opriți utilizarea site-ului https://voievodul.md/.</p>
          </div>
        </div>
      </main>
    </div>
  )
}