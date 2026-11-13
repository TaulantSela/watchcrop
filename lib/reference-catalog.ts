/**
 * The autocomplete vocabulary: well-known brands and their model families.
 *
 * It exists so autocomplete doesn't give the game away. Built from the puzzle
 * catalog alone, knowing the brand left exactly one model to pick (and the
 * brand list itself shrank the field to a handful). Puzzle watches are merged
 * in on top of this list (lib/game.ts), so every answer stays selectable; when
 * you add a watch, add its model family here too so it doesn't stand out.
 *
 * Facts only (names of products), no images or descriptions.
 */
export const REFERENCE_CATALOG: Record<string, string[]> = {
  "A. Lange & Söhne": ["1815", "Datograph", "Lange 1", "Odysseus", "Saxonia", "Zeitwerk"],
  "Audemars Piguet": ["Code 11.59", "Jules Audemars", "Millenary", "Royal Oak", "Royal Oak Concept", "Royal Oak Offshore"],
  Baltic: ["Aquascaphe", "Bicompax", "HMS", "MR01"],
  "Bell & Ross": ["BR 03", "BR 05", "BR V2"],
  Blancpain: ["Air Command", "Fifty Fathoms", "Villeret"],
  Breguet: ["Classique", "Marine", "Reine de Naples", "Tradition", "Type XX"],
  Breitling: ["Avenger", "Chronomat", "Endurance Pro", "Navitimer", "Premier", "Superocean", "Superocean Heritage", "Top Time"],
  Bulgari: ["Aluminium", "Bvlgari Bvlgari", "Octo Finissimo", "Serpenti"],
  Bulova: ["Lunar Pilot", "Marine Star", "Oceanographer", "Precisionist"],
  Cartier: ["Baignoire", "Ballon Bleu", "Clé", "Crash", "Drive", "Panthère", "Pasha", "Ronde", "Santos", "Tank"],
  Casio: ["A168", "Baby-G", "Duro", "Edifice", "F-91W", "G-Shock", "Oceanus", "Pro Trek"],
  Certina: ["DS Action", "DS PH200M", "DS-1"],
  Chopard: ["Alpine Eagle", "Happy Sport", "L.U.C", "Mille Miglia"],
  "Christopher Ward": ["Bel Canto", "C60 Trident", "C63 Sealander", "The Twelve"],
  Citizen: ["Chronomaster", "Eco-Drive", "Promaster", "Series 8", "The Citizen", "Tsuyosa"],
  Doxa: ["SUB 200", "SUB 300", "SUB 600T"],
  "F.P. Journe": ["Chronomètre Bleu", "Chronomètre Souverain", "Élégante", "Octa"],
  "Frederique Constant": ["Classics", "Highlife", "Manufacture", "Slimline"],
  "Girard-Perregaux": ["1966", "Laureato"],
  "Glashütte Original": ["PanoMatic", "SeaQ", "Senator", "Seventies", "Sixties"],
  "Grand Seiko": ["Elegance", "Evolution 9", "Heritage", "Sport"],
  "H. Moser & Cie": ["Endeavour", "Pioneer", "Streamliner", "Venturer"],
  Hamilton: ["American Classic", "Jazzmaster", "Khaki Aviation", "Khaki Field", "Khaki Navy", "Ventura"],
  Hublot: ["Big Bang", "Classic Fusion", "Spirit of Big Bang", "Square Bang"],
  IWC: ["Aquatimer", "Big Pilot", "Da Vinci", "Ingenieur", "Pilot's Watch", "Portofino", "Portugieser"],
  "Jaeger-LeCoultre": ["Master Control", "Master Ultra Thin", "Polaris", "Rendez-Vous", "Reverso"],
  Junghans: ["Max Bill", "Meister"],
  Longines: ["Conquest", "DolceVita", "Heritage", "HydroConquest", "Legend Diver", "Master Collection", "Spirit", "Ultra-Chron"],
  Lorier: ["Falcon", "Gemini", "Neptune"],
  Mido: ["Baroncelli", "Commander", "Multifort", "Ocean Star"],
  Montblanc: ["1858", "Heritage", "Star Legacy", "TimeWalker"],
  Nomos: ["Ahoi", "Club", "Metro", "Orion", "Tangente", "Tetra"],
  Omega: ["Constellation", "De Ville", "Seamaster", "Seamaster Aqua Terra", "Seamaster Diver 300M", "Seamaster Planet Ocean", "Speedmaster"],
  Orient: ["Bambino", "Kamasu", "Mako", "Ray", "Star"],
  Oris: ["Aquis", "Big Crown", "Divers Sixty-Five", "ProPilot"],
  Panerai: ["Luminor", "Luminor Due", "Radiomir", "Submersible"],
  "Patek Philippe": ["Aquanaut", "Calatrava", "Complications", "Cubitus", "Golden Ellipse", "Gondolo", "Grand Complications", "Nautilus", "Twenty~4"],
  Rado: ["Captain Cook", "DiaStar", "True"],
  "Richard Mille": ["RM 011", "RM 035", "RM 055"],
  Rolex: ["1908", "Air-King", "Cellini", "Datejust", "Day-Date", "Daytona", "Deepsea", "Explorer", "Explorer II", "GMT-Master II", "Land-Dweller", "Milgauss", "Oyster Perpetual", "Sea-Dweller", "Sky-Dweller", "Submariner", "Yacht-Master"],
  Seiko: ["5 Sports", "Alpinist", "Astron", "King Seiko", "Marinemaster", "Presage", "Prospex", "Samurai", "SKX007", "Sumo", "Tuna", "Turtle"],
  Sinn: ["103", "104", "356", "556", "EZM", "U1"],
  Squale: ["1521", "Matic", "Sub-39"],
  Swatch: ["Big Bold", "MoonSwatch", "Sistem51"],
  "TAG Heuer": ["Aquaracer", "Autavia", "Carrera", "Formula 1", "Link", "Monaco"],
  Timex: ["Expedition", "Marlin", "Q Timex", "Weekender"],
  Tissot: ["Gentleman", "Le Locle", "PRX", "Seastar", "Telemeter 1938", "Visodate"],
  Tudor: ["1926", "Black Bay", "Heritage Chrono", "North Flag", "Pelagos", "Ranger", "Royal"],
  "Ulysse Nardin": ["Blast", "Diver", "Freak", "Marine"],
  "Vacheron Constantin": ["Égérie", "Fiftysix", "Historiques", "Overseas", "Patrimony", "Traditionnelle"],
  Vostok: ["Amphibia", "Komandirskie"],
  Zenith: ["Chronomaster", "Defy", "El Primero", "Pilot"],
};
