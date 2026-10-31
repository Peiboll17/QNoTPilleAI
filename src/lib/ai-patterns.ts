// Patrones de texto típicos de IA: compartidos entre el detector y el humanizador

import type { Lang } from "./shared-types";

export interface ClicheRule {
  phrase: string;
  weight: number; // peso en detección (por aparición)
  replacements?: string[]; // alternativas humanas para el humanizador
}

// Frases hechas / muletillas características de modelos de lenguaje (español)
export const AI_CLICHES: ClicheRule[] = [
  { phrase: "en el mundo actual", weight: 2, replacements: ["hoy", "hoy en día", "a estas alturas"] },
  { phrase: "en la sociedad actual", weight: 2, replacements: ["hoy", "en la sociedad de ahora"] },
  { phrase: "en el panorama actual", weight: 2, replacements: ["hoy", "con el cuadro de ahora"] },
  { phrase: "en la era digital", weight: 2, replacements: ["ahora", "con internet", "hoy"] },
  { phrase: "en la actualidad", weight: 1.5, replacements: ["hoy", "ahora", "actualmente"] },
  { phrase: "en la vida moderna", weight: 2, replacements: ["hoy"] },
  { phrase: "es importante destacar que", weight: 2, replacements: ["conviene decir que", "lo cierto es que", "hace falta señalar que"] },
  { phrase: "es importante señalar que", weight: 2, replacements: ["conviene decir que", "hace falta apuntar que"] },
  { phrase: "es importante mencionar que", weight: 2, replacements: ["conviene decir que", "merece decirse que"] },
  { phrase: "es importante resaltar que", weight: 2, replacements: ["conviene subrayar que", "hace falta decir que"] },
  { phrase: "es importante tener en cuenta que", weight: 2, replacements: ["hace falta recordar que", "no hay que olvidar que", "ten en cuenta que"] },
  { phrase: "cabe destacar que", weight: 2, replacements: ["destaca que", "conviene saber que", "hay que decir que"] },
  { phrase: "cabe señalar que", weight: 2, replacements: ["conviene apuntar que", "señalo que"] },
  { phrase: "cabe mencionar que", weight: 1.5, replacements: ["conviene mencionar que", "merece decirse que"] },
  { phrase: "cabe resaltar que", weight: 2, replacements: ["conviene subrayar que"] },
  { phrase: "es relevante mencionar que", weight: 1.5, replacements: ["conviene decir que"] },
  { phrase: "vale la pena mencionar", weight: 1.5, replacements: ["merece la pena decir"] },
  { phrase: "es digno de mención", weight: 1.5, replacements: ["merece mención"] },
  { phrase: "juega un papel crucial", weight: 2, replacements: ["es clave", "resulta determinante"] },
  { phrase: "juega un papel fundamental", weight: 2, replacements: ["es clave", "pesa mucho"] },
  { phrase: "juega un papel importante", weight: 1.5, replacements: ["cuenta mucho", "influye bastante"] },
  { phrase: "juega un papel vital", weight: 2, replacements: ["es clave"] },
  { phrase: "desempeña un papel crucial", weight: 2, replacements: ["es clave"] },
  { phrase: "desempeña un papel fundamental", weight: 2, replacements: ["es determinante", "es clave"] },
  { phrase: "desempeña un papel importante", weight: 1.5, replacements: ["influye bastante", "cuenta mucho"] },
  { phrase: "desempeña un papel vital", weight: 2, replacements: ["es clave"] },
  { phrase: "un papel crucial", weight: 1, replacements: ["un sitio clave"] },
  { phrase: "un papel fundamental", weight: 1, replacements: ["un peso clave"] },
  { phrase: "en conclusión", weight: 2, replacements: ["al final", "para terminar", "cerrando ya"] },
  { phrase: "en resumen", weight: 1.5, replacements: ["resumiendo", "en corto", "dicho rápido"] },
  { phrase: "en definitiva", weight: 1.5, replacements: ["a la postre", "al final"] },
  { phrase: "en síntesis", weight: 1.5, replacements: ["resumiendo"] },
  { phrase: "para concluir", weight: 2, replacements: ["para terminar", "para acabar"] },
  { phrase: "como conclusión", weight: 2, replacements: ["para cerrar"] },
  { phrase: "es fundamental", weight: 1, replacements: ["es clave", "hace falta", "es básico"] },
  { phrase: "es esencial", weight: 1, replacements: ["es clave", "es de lo que más importa"] },
  { phrase: "es crucial", weight: 1.5, replacements: ["es clave", "decide mucho"] },
  { phrase: "de vital importancia", weight: 2, replacements: ["muy importante", "clave"] },
  { phrase: "de suma importancia", weight: 2, replacements: ["muy importante"] },
  { phrase: "de gran importancia", weight: 1, replacements: ["muy importante"] },
  { phrase: "una amplia gama de", weight: 2, replacements: ["todo tipo de", "muchos tipos de"] },
  { phrase: "una gran variedad de", weight: 1.5, replacements: ["todo tipo de", "mil tipos de"] },
  { phrase: "una gran cantidad de", weight: 0.5, replacements: ["un montón de", "mucha"] },
  { phrase: "ha demostrado ser", weight: 1.5, replacements: ["ha acabado siendo", "resulta ser", "se ha mostrado"] },
  { phrase: "se ha demostrado que", weight: 1, replacements: ["está visto que", "queda claro que"] },
  { phrase: "es ampliamente reconocido", weight: 2, replacements: ["todo el mundo sabe", "es de sobra conocido"] },
  { phrase: "ampliamente reconocido", weight: 1.5, replacements: ["de sobra conocido"] },
  { phrase: "sin lugar a dudas", weight: 1.5, replacements: ["sin duda", "a todas luces"] },
  { phrase: "sin duda alguna", weight: 1, replacements: ["sin duda", "claro"] },
  { phrase: "en este sentido", weight: 1, replacements: ["en esa línea", "así las cosas"] },
  { phrase: "a lo largo de los años", weight: 1, replacements: ["con los años", "con el tiempo"] },
  { phrase: "a lo largo de la historia", weight: 1.5, replacements: ["con el tiempo", "desde siempre"] },
  { phrase: "sumérgete en", weight: 2, replacements: ["mete de lleno en", "entra de lleno en"] },
  { phrase: "sumérgete", weight: 2, replacements: ["mete de lleno"] },
  { phrase: "adentrarse en", weight: 1.5, replacements: ["entrar en", "meterse en"] },
  { phrase: "adéntrate en", weight: 2, replacements: ["entra de lleno en"] },
  { phrase: "desentrañar", weight: 1, replacements: ["aclarar"] },
  { phrase: "allanar el camino", weight: 2, replacements: ["abrir camino"] },
  { phrase: "aprovechar el poder de", weight: 2, replacements: ["sacar partido de", "aprovechar"] },
  { phrase: "desbloquear el potencial", weight: 2, replacements: ["sacar todo el partido", "aprovechar"] },
  { phrase: "el potencial de", weight: 0.5, replacements: ["lo que se puede sacar de"] },
  { phrase: "revolucionar", weight: 1, replacements: ["cambiar de arriba abajo", "dar la vuelta a"] },
  { phrase: "transformador", weight: 1, replacements: ["que cambia las cosas"] },
  { phrase: "las complejidades de", weight: 1.5, replacements: ["los líos de", "lo complicado de"] },
  { phrase: "las complejidades", weight: 1, replacements: ["lo complicado"] },
  { phrase: "innumerables", weight: 1, replacements: ["un montón de", "mil"] },
  { phrase: "infinitas posibilidades", weight: 2, replacements: ["mil posibilidades", "mucho margen"] },
  { phrase: "las posibilidades son infinitas", weight: 2, replacements: ["se puede hacer mucho", "hay mucho por donde tirar"] },
  { phrase: "el futuro es prometedor", weight: 2, replacements: ["el futuro pinta bien"] },
  { phrase: "un testimonio del", weight: 1.5, replacements: ["una muestra del"] },
  { phrase: "un testimonio de", weight: 1.5, replacements: ["una muestra de"] },
  { phrase: "testamento de", weight: 1.5, replacements: ["prueba de"] },
  { phrase: "en el corazón de", weight: 1, replacements: ["en pleno", "dentro de"] },
  { phrase: "en el bullicio de", weight: 2, replacements: ["en medio de"] },
  { phrase: "en el telón de fondo", weight: 2, replacements: ["de fondo"] },
  { phrase: "una fusión perfecta de", weight: 2, replacements: ["una mezcla de"] },
  { phrase: "fusión perfecta", weight: 1.5, replacements: ["mezcla redonda"] },
  { phrase: "sinergia", weight: 1.5, replacements: ["colaboración"] },
  { phrase: "holístico", weight: 1.5, replacements: ["global", "completo"] },
  { phrase: "holística", weight: 1.5, replacements: ["global", "completa"] },
  { phrase: "meticuloso", weight: 0.5, replacements: ["cuidadoso", "minucioso"] },
  { phrase: "meticulosa", weight: 0.5, replacements: ["cuidadosa", "minuciosa"] },
  { phrase: "siéntete libre de", weight: 2, replacements: ["puedes", "no cortes en"] },
  { phrase: "no dudes en", weight: 1.5, replacements: ["puedes", "anímate a"] },
  { phrase: "embarcarse en", weight: 1.5, replacements: ["arrancar", "lanzarse a"] },
  { phrase: "marcar el comienzo de", weight: 2, replacements: ["abrir", "dar empiezo a"] },
  { phrase: "en última instancia", weight: 1, replacements: ["al final", "a la postre"] },
  { phrase: "en esencia", weight: 1, replacements: ["en el fondo"] },
  { phrase: "esencialmente", weight: 0.5, replacements: ["en el fondo"] },
  { phrase: "por ende", weight: 1.5, replacements: ["así que", "por eso"] },
  { phrase: "por consiguiente", weight: 1.5, replacements: ["así que", "por eso"] },
  { phrase: "asimismo", weight: 1.5, replacements: ["también", "encima", "además de eso"] },
  { phrase: "no obstante", weight: 0.5, replacements: ["aun así", "ahora bien", "eso sí"] },
  { phrase: "en primer lugar", weight: 0.5, replacements: ["primero", "para empezar"] },
  { phrase: "en segundo lugar", weight: 0.5, replacements: ["luego", "después"] },
  { phrase: "en tercer lugar", weight: 0.5, replacements: ["después", "tercero"] },
  { phrase: "por otro lado", weight: 0.5, replacements: ["aparte", "a la vez", "aparte de eso"] },
  { phrase: "por una parte", weight: 0.5, replacements: ["por un lado"] },
  { phrase: "dicho esto", weight: 0.5, replacements: ["dicho lo cual", "y con esto"] },
  { phrase: "a grandes rasgos", weight: 0.5 },
  { phrase: "en el telón", weight: 2, replacements: ["de fondo"] },
  { phrase: "navegar por", weight: 0.5, replacements: ["moverse por", "recorrer"] },
  { phrase: "panorama", weight: 0.5, replacements: ["escenario", "cuadro"] },
  { phrase: "robusto", weight: 0.5, replacements: ["sólido"] },
  { phrase: "robusta", weight: 0.5, replacements: ["sólida"] },
  { phrase: "imprescindible", weight: 0.5, replacements: ["imprescindible" ] },
  { phrase: "pivotal", weight: 2, replacements: ["clave"] },
  { phrase: "fomentar", weight: 0.3 },
  // --- segunda tanda: patrones frecuentes en salidas recientes de modelos ---
  { phrase: "es importante recordar que", weight: 2, replacements: ["conviene recordar que", "hace falta recordar que"] },
  { phrase: "no hay que olvidar que", weight: 1.5, replacements: ["recuerda que", "no olvides que"] },
  { phrase: "cabe recalcar que", weight: 2, replacements: ["conviene subrayar que"] },
  { phrase: "cabe subrayar que", weight: 2, replacements: ["conviene subrayar que"] },
  { phrase: "en resumidas cuentas", weight: 1.5, replacements: ["en corto", "resumiendo"] },
  { phrase: "a fin de cuentas", weight: 1, replacements: ["al final"] },
  { phrase: "en este contexto", weight: 1, replacements: ["aquí", "en este cuadro"] },
  { phrase: "de cara al futuro", weight: 1.5, replacements: ["de aquí en adelante", "mirando adelante"] },
  { phrase: "la clave está en", weight: 1.5, replacements: ["lo importante es", "el truco está en"] },
  { phrase: "no se trata solo de", weight: 1.5, replacements: ["no es solo cuestión de"] },
  { phrase: "no se trata únicamente de", weight: 1.5, replacements: ["no es solo cuestión de"] },
  { phrase: "punto de inflexión", weight: 1.5, replacements: ["punto de giro", "cambio decisivo"] },
  { phrase: "una nueva era", weight: 1.5, replacements: ["un momento nuevo"] },
  { phrase: "cambio de paradigma", weight: 1.5, replacements: ["cambio de fondo"] },
  { phrase: "profundizar en", weight: 0.5, replacements: ["entrar de lleno en", "detallar"] },
  { phrase: "a lo largo de este artículo", weight: 2, replacements: ["en estas líneas"] },
  { phrase: "en este artículo", weight: 1, replacements: ["aquí"] },
  { phrase: "exploremos", weight: 2, replacements: ["veamos", "miremos"] },
  { phrase: "adentrémonos", weight: 2, replacements: ["entremos"] },
  { phrase: "desglosar", weight: 1, replacements: ["detallar", "ir punto por punto"] },
  { phrase: "es innegable que", weight: 2, replacements: ["está claro que", "se ve a simple vista que"] },
  { phrase: "es indudable que", weight: 1.5, replacements: ["está claro que"] },
  { phrase: "es evidente que", weight: 0.5, replacements: ["está claro que", "se ve que"] },
  { phrase: "resulta fundamental", weight: 1.5, replacements: ["es clave", "hace falta"] },
  { phrase: "resulta esencial", weight: 1.5, replacements: ["es clave"] },
  { phrase: "resulta crucial", weight: 1.5, replacements: ["es clave", "decide mucho"] },
  { phrase: "se ha convertido en", weight: 0.5, replacements: ["acaba siendo", "es hoy"] },
  { phrase: "a día de hoy", weight: 1, replacements: ["hoy", "todavía"] },
  { phrase: "hoy por hoy", weight: 0.5, replacements: ["hoy"] },
  { phrase: "es menester", weight: 1.5, replacements: ["hace falta"] },
  { phrase: "con el fin de", weight: 0.5, replacements: ["para"] },
  { phrase: "en el trasfondo", weight: 1.5, replacements: ["de fondo"] },
  { phrase: "una letanía de", weight: 1.5, replacements: ["un sinfín de"] },
  { phrase: "hacia dónde se dirige", weight: 1.5, replacements: ["hacia dónde va"] },
  { phrase: "vertebrar", weight: 1.5, replacements: ["estructurar", "dar forma a"] },
  { phrase: "navegar hacia", weight: 1.5, replacements: ["ir hacia"] },
];

// Marcas de escritura humana (coloquialismos, primera persona, etc.)
export const HUMAN_MARKERS: string[] = [
  "la verdad", "o sea", "en plan", "digamos", "vamos a ver", "bueno,",
  "pues", "mira,", "oye", "ojo:", "ojo,", "de hecho", "es que", "es más",
  "total, que", "francamente", "personalmente", "creo que", "me parece",
  "en mi opinión", "en mi experiencia", "recuerdo que", "por cierto",
  "al menos", "por lo menos", "aunque sea", "un poco", "algo así",
  "por así decirlo", "dicho de otro modo", "para qué engañarnos",
  "jaja", "jeje", "vaya", "uf,", "eh,", "oye,", "anda que", "menudo",
  "cómo no", "claro está", "a decir verdad", "la cuestión es", "yo",
  "mi", "mí", "nuestro", "nuestra", "anoche", "ayer", "esta mañana",
  "la semana pasada", "el otro día",
];

// Conectores de inicio de frase (densidad alta = estilo IA)
export const SENTENCE_START_CONNECTORS: string[] = [
  "además", "asimismo", "no obstante", "sin embargo", "por lo tanto",
  "por tanto", "por consiguiente", "por ende", "en consecuencia",
  "en primer lugar", "en segundo lugar", "en tercer lugar", "por último",
  "por otro lado", "por una parte", "por otra parte", "en este sentido",
  "en efecto", "de hecho", "así mismo", "así pues", "es más", "ahora bien",
  "en resumen", "en conclusión", "en definitiva", "en síntesis",
  "para concluir", "finalmente", "en consecuencia", "sumado a esto",
  "a su vez", "de igual modo", "de manera similar", "en consecuencia",
  "cabe destacar", "cabe señalar", "es importante", "es fundamental",
  "es crucial", "en primer término", "seguidamente", "posteriormente",
];

// Estructuras "no solo ... sino también"
export const NO_SOLO_REGEX = /no solo\b([^.;!?]{2,120}?)\bsino (?:también|además)\b/giu;

// ---------- inglés ----------

// Frases hechas / muletillas características de modelos de lenguaje (inglés)
export const AI_CLICHES_EN: ClicheRule[] = [
  { phrase: "in today's world", weight: 2, replacements: ["today", "these days"] },
  { phrase: "in today's fast-paced world", weight: 2.5, replacements: ["today", "these days"] },
  { phrase: "in today's digital age", weight: 2.5, replacements: ["today", "with the internet"] },
  { phrase: "in the modern world", weight: 2, replacements: ["today"] },
  { phrase: "in the digital age", weight: 2, replacements: ["today", "with the internet"] },
  { phrase: "in today's society", weight: 2, replacements: ["today", "in society right now"] },
  { phrase: "in the ever-evolving", weight: 2.5, replacements: ["in the changing"] },
  { phrase: "ever-evolving", weight: 1.5, replacements: ["changing", "shifting"] },
  { phrase: "it is important to note that", weight: 2.5, replacements: ["notably,", "keep in mind:", "worth saying:"] },
  { phrase: "it's important to note that", weight: 2.5, replacements: ["notably,", "keep in mind:"] },
  { phrase: "it is important to remember that", weight: 2, replacements: ["remember that", "keep in mind that"] },
  { phrase: "it is worth noting that", weight: 2.5, replacements: ["notably,", "worth saying:"] },
  { phrase: "it's worth noting that", weight: 2.5, replacements: ["notably,", "worth saying:"] },
  { phrase: "it is essential to note", weight: 2, replacements: ["note that"] },
  { phrase: "it should be noted that", weight: 2, replacements: ["and note:", "also:"] },
  { phrase: "it is important to understand that", weight: 2, replacements: ["understand that", "the point is that"] },
  { phrase: "plays a crucial role", weight: 2.5, replacements: ["is key", "matters a lot"] },
  { phrase: "plays a vital role", weight: 2.5, replacements: ["is key"] },
  { phrase: "plays an important role", weight: 2, replacements: ["counts a lot", "matters"] },
  { phrase: "plays a significant role", weight: 2, replacements: ["matters a lot"] },
  { phrase: "serves as a testament", weight: 2.5, replacements: ["shows"] },
  { phrase: "a testament to", weight: 2, replacements: ["proof of", "a sign of"] },
  { phrase: "stands as a testament", weight: 2.5, replacements: ["shows"] },
  { phrase: "in conclusion", weight: 2.5, replacements: ["all in all", "to wrap up", "in the end"] },
  { phrase: "in summary", weight: 2, replacements: ["in short", "to sum up"] },
  { phrase: "to summarize", weight: 2, replacements: ["in short", "long story short"] },
  { phrase: "in essence", weight: 1.5, replacements: ["at heart", "in short"] },
  { phrase: "to conclude", weight: 2, replacements: ["to wrap up", "to end"] },
  { phrase: "delve into", weight: 2.5, replacements: ["dig into", "get into", "look closely at"] },
  { phrase: "delves into", weight: 2.5, replacements: ["digs into", "gets into"] },
  { phrase: "delving into", weight: 2.5, replacements: ["digging into"] },
  { phrase: "in the realm of", weight: 2, replacements: ["in", "within"] },
  { phrase: "navigate the complexities", weight: 2.5, replacements: ["deal with the mess of"] },
  { phrase: "navigating the", weight: 1.5, replacements: ["dealing with the"] },
  { phrase: "unlock the potential", weight: 2.5, replacements: ["get the most out of"] },
  { phrase: "unlock the full potential", weight: 2.5, replacements: ["get everything out of"] },
  { phrase: "harness the power of", weight: 2.5, replacements: ["put to work", "make the most of"] },
  { phrase: "unleash the power of", weight: 2.5, replacements: ["put to work"] },
  { phrase: "a myriad of", weight: 2, replacements: ["countless", "loads of"] },
  { phrase: "a plethora of", weight: 2.5, replacements: ["plenty of", "loads of"] },
  { phrase: "a wide range of", weight: 1.5, replacements: ["all kinds of", "many"] },
  { phrase: "a wide array of", weight: 2, replacements: ["all kinds of"] },
  { phrase: "a wealth of", weight: 1.5, replacements: ["plenty of"] },
  { phrase: "revolutionize", weight: 1.5, replacements: ["turn upside down", "shake up"] },
  { phrase: "game-changer", weight: 2, replacements: ["a big deal", "a real shift"] },
  { phrase: "paradigm shift", weight: 2, replacements: ["deep change", "sea change"] },
  { phrase: "cutting-edge", weight: 1.5, replacements: ["latest", "brand new"] },
  { phrase: "state-of-the-art", weight: 1.5, replacements: ["top", "latest"] },
  { phrase: "seamlessly", weight: 2, replacements: ["smoothly", "easily"] },
  { phrase: "seamless", weight: 1.5, replacements: ["smooth"] },
  { phrase: "robust", weight: 0.5, replacements: ["solid", "sturdy"] },
  { phrase: "pivotal", weight: 2, replacements: ["key", "central"] },
  { phrase: "meticulous", weight: 1, replacements: ["careful", "thorough"] },
  { phrase: "meticulously", weight: 1.5, replacements: ["carefully"] },
  { phrase: "holistic", weight: 1.5, replacements: ["complete", "all-around"] },
  { phrase: "the complexities of", weight: 1.5, replacements: ["the mess of", "what's tricky about"] },
  { phrase: "embark on", weight: 2, replacements: ["start", "set out on"] },
  { phrase: "embark on a journey", weight: 2.5, replacements: ["set out", "get going"] },
  { phrase: "take a deep dive into", weight: 2.5, replacements: ["dig into"] },
  { phrase: "deep dive", weight: 1.5, replacements: ["close look"] },
  { phrase: "the possibilities are endless", weight: 2.5, replacements: ["there's a lot you can do"] },
  { phrase: "endless possibilities", weight: 2.5, replacements: ["plenty of options"] },
  { phrase: "the future is bright", weight: 2, replacements: ["things look good"] },
  { phrase: "a new era of", weight: 2, replacements: ["a fresh chapter of"] },
  { phrase: "at the forefront of", weight: 2, replacements: ["leading", "at the front of"] },
  { phrase: "pave the way for", weight: 2, replacements: ["open the door to", "set up"] },
  { phrase: "underscores the importance", weight: 2, replacements: ["shows why it matters"] },
  { phrase: "highlight the importance", weight: 1.5, replacements: ["show why it matters"] },
  { phrase: "when it comes to", weight: 0.5, replacements: ["with", "regarding"] },
  { phrase: "look no further", weight: 2.5, replacements: ["you've found it", "stop searching"] },
  { phrase: "whether you're a", weight: 2, replacements: ["if you're a"] },
  { phrase: "elevate your", weight: 2, replacements: ["improve your", "boost your"] },
  { phrase: "take it to the next level", weight: 2, replacements: ["step it up"] },
  { phrase: "foster", weight: 0.3, replacements: ["build", "encourage"] },
  { phrase: "leverage", weight: 1, replacements: ["use", "put to work"] },
  { phrase: "utilize", weight: 1, replacements: ["use"] },
  { phrase: "utilizing", weight: 1, replacements: ["using"] },
  { phrase: "comprehensive", weight: 0.5, replacements: ["complete", "thorough"] },
  { phrase: "notably", weight: 0.5, replacements: ["especially"] },
  { phrase: "significantly", weight: 0.5, replacements: ["a lot", "by a lot"] },
  { phrase: "furthermore", weight: 1.5, replacements: ["also", "on top of that"] },
  { phrase: "moreover", weight: 1.5, replacements: ["also", "and"] },
  { phrase: "additionally", weight: 1.5, replacements: ["also", "plus"] },
  { phrase: "consequently", weight: 1.5, replacements: ["so", "as a result"] },
  { phrase: "nevertheless", weight: 1, replacements: ["even so", "still"] },
  { phrase: "nonetheless", weight: 1, replacements: ["even so", "still"] },
  { phrase: "as we navigate", weight: 2, replacements: ["as we deal with"] },
  { phrase: "in the vast landscape of", weight: 2.5, replacements: ["in"] },
  { phrase: "the landscape of", weight: 1, replacements: ["the world of"] },
  { phrase: "a rich tapestry of", weight: 2.5, replacements: ["a mix of"] },
  { phrase: "tapestry", weight: 1.5, replacements: ["mix", "blend"] },
  { phrase: "first and foremost", weight: 1.5, replacements: ["first"] },
  { phrase: "last but not least", weight: 2, replacements: ["finally"] },
  { phrase: "in this article", weight: 1, replacements: ["here"] },
  { phrase: "throughout this article", weight: 2, replacements: ["in these lines"] },
  { phrase: "it goes without saying", weight: 2, replacements: ["obviously"] },
  { phrase: "shed light on", weight: 2, replacements: ["clarify", "explain"] },
  { phrase: "in light of", weight: 1, replacements: ["given", "because of"] },
  { phrase: "the key takeaway", weight: 2, replacements: ["the point", "what matters"] },
  { phrase: "keep in mind that", weight: 1, replacements: ["remember that"] },
  { phrase: "is crucial for", weight: 1.5, replacements: ["matters for", "is key to"] },
  { phrase: "is essential for", weight: 1.5, replacements: ["matters for"] },
  { phrase: "it is advisable to", weight: 2, replacements: ["it's best to", "you should"] },
  { phrase: "ensure that", weight: 0.5, replacements: ["make sure"] },
  { phrase: "in order to", weight: 0.5, replacements: ["to"] },
  { phrase: "due to the fact that", weight: 2, replacements: ["because"] },
  { phrase: "a double-edged sword", weight: 1.5, replacements: ["cuts both ways"] },
  { phrase: "the ever-growing", weight: 2, replacements: ["the growing"] },
  { phrase: "ever-growing", weight: 1.5, replacements: ["growing"] },
  { phrase: "myriad", weight: 1.5, replacements: ["countless"] },
];

// Marcas de escritura humana en inglés
export const HUMAN_MARKERS_EN: string[] = [
  "i think", "i guess", "i mean", "you know", "kind of", "sort of", "pretty much",
  "to be honest", "honestly", "actually", "basically", "anyway", "by the way",
  "to be fair", "in my experience", "in my opinion", "i remember", "i've noticed",
  "at least", "a bit", "sorta", "yeah", "nope", "weird", "messy", "annoying",
  "haha", "hahaha", "omg", "ugh", "well,", "look,", "listen,", "seriously",
  "yesterday", "last night", "last week", "the other day", "my", "our", "we",
  "i", "me", "let's", "don't", "can't", "won't", "it's been",
];

// Conectores de inicio de frase en inglés (densidad alta = estilo IA)
export const SENTENCE_START_CONNECTORS_EN: string[] = [
  "moreover", "furthermore", "additionally", "however", "therefore", "thus",
  "consequently", "hence", "in addition", "in conclusion", "in summary",
  "overall", "firstly", "secondly", "thirdly", "finally", "lastly",
  "on the other hand", "in particular", "notably", "importantly",
  "specifically", "meanwhile", "nevertheless", "nonetheless", "as a result",
  "for instance", "for example", "ultimately", "in essence", "indeed",
  "in fact", "similarly", "likewise", "conversely", "subsequently",
  "in contrast", "to conclude", "to summarize", "as such", "accordingly",
];

// Estructuras "not only ... but also"
export const NOT_ONLY_REGEX = /not only\b([^.;!?]{2,120}?)\bbut (?:also|as well)\b/giu;

// ---------- francés ----------

export const AI_CLICHES_FR: ClicheRule[] = [
  { phrase: "de nos jours", weight: 1.5, replacements: ["aujourd'hui", "ces derniers temps"] },
  { phrase: "dans le monde actuel", weight: 2, replacements: ["aujourd'hui"] },
  { phrase: "dans la société actuelle", weight: 2, replacements: ["aujourd'hui"] },
  { phrase: "dans le monde d'aujourd'hui", weight: 2, replacements: ["aujourd'hui"] },
  { phrase: "à l'ère numérique", weight: 2, replacements: ["aujourd'hui", "avec internet"] },
  { phrase: "à l'ère du numérique", weight: 2, replacements: ["aujourd'hui", "avec internet"] },
  { phrase: "en cette ère de", weight: 2, replacements: ["dans ce temps de"] },
  { phrase: "il est important de noter que", weight: 2.5, replacements: ["à noter que", "précisons que"] },
  { phrase: "il convient de noter que", weight: 2, replacements: ["notons que", "précisons que"] },
  { phrase: "il est important de souligner que", weight: 2.5, replacements: ["soulignons que"] },
  { phrase: "il convient de souligner que", weight: 2, replacements: ["soulignons que"] },
  { phrase: "il faut souligner que", weight: 1.5, replacements: ["soulignons que"] },
  { phrase: "il faut noter que", weight: 1.5, replacements: ["notons que"] },
  { phrase: "il est essentiel de", weight: 1.5, replacements: ["il faut"] },
  { phrase: "il est crucial de", weight: 1.5, replacements: ["il faut absolument"] },
  { phrase: "il est indispensable de", weight: 1.5, replacements: ["il faut"] },
  { phrase: "joue un rôle crucial", weight: 2, replacements: ["est essentiel", "compte énormément"] },
  { phrase: "joue un rôle important", weight: 1.5, replacements: ["compte beaucoup"] },
  { phrase: "joue un rôle clé", weight: 2, replacements: ["est essentiel"] },
  { phrase: "joue un rôle déterminant", weight: 2, replacements: ["décide de beaucoup de choses"] },
  { phrase: "occupe une place centrale", weight: 1.5, replacements: ["est au cœur de"] },
  { phrase: "en conclusion", weight: 2, replacements: ["pour finir", "au final"] },
  { phrase: "en résumé", weight: 1.5, replacements: ["bref", "en gros"] },
  { phrase: "en somme", weight: 1.5, replacements: ["au fond"] },
  { phrase: "en définitive", weight: 1.5, replacements: ["au final"] },
  { phrase: "pour conclure", weight: 2, replacements: ["pour finir"] },
  { phrase: "plongeons dans", weight: 2, replacements: ["entrons dans"] },
  { phrase: "explorons", weight: 1.5, replacements: ["regardons"] },
  { phrase: "démêler les complexités de", weight: 2, replacements: ["comprendre les méandres de"] },
  { phrase: "libérer le potentiel de", weight: 2, replacements: ["tirer parti de"] },
  { phrase: "exploiter la puissance de", weight: 2, replacements: ["tirer parti de"] },
  { phrase: "une myriade de", weight: 2, replacements: ["des tas de", "quantité de"] },
  { phrase: "une pléthore de", weight: 2, replacements: ["des tas de"] },
  { phrase: "une large gamme de", weight: 1.5, replacements: ["toutes sortes de"] },
  { phrase: "un large éventail de", weight: 1.5, replacements: ["toutes sortes de"] },
  { phrase: "révolutionner", weight: 1, replacements: ["bouleverser"] },
  { phrase: "changement de paradigme", weight: 1.5, replacements: ["changement de fond"] },
  { phrase: "de pointe", weight: 1, replacements: ["dernier cri"] },
  { phrase: "à la pointe de", weight: 1.5, replacements: ["en tête de"] },
  { phrase: "en toute transparence", weight: 1.5, replacements: ["sans effort"] },
  { phrase: "ouvrir la voie à", weight: 1.5, replacements: ["préparer le terrain pour"] },
  { phrase: "les possibilités sont infinies", weight: 2, replacements: ["on peut faire beaucoup"] },
  { phrase: "un témoignage de", weight: 1.5, replacements: ["une preuve de"] },
  { phrase: "dans cet article", weight: 1, replacements: ["ici"] },
  { phrase: "au fil de cet article", weight: 2, replacements: ["dans ces lignes"] },
  { phrase: "il va sans dire que", weight: 2, replacements: ["évidemment"] },
  { phrase: "mettre en lumière", weight: 1.5, replacements: ["montrer", "révéler"] },
  { phrase: "cette approche holistique", weight: 1.5, replacements: ["cette vue d'ensemble"] },
  { phrase: "dernier point mais non le moindre", weight: 2, replacements: ["enfin"] },
  { phrase: "dans le paysage de", weight: 1.5, replacements: ["dans le monde de"] },
  { phrase: "il est indéniable que", weight: 2, replacements: ["c'est clair que"] },
];

export const HUMAN_MARKERS_FR: string[] = [
  "je pense", "je crois", "je trouve", "en fait", "franchement", "honnêtement",
  "en gros", "genre", "bref", "bon,", "écoute", "dis donc", "à vrai dire",
  "pour être honnête", "de mon temps", "l'autre jour", "hier", "la semaine dernière",
  "je", "me", "mon", "ma", "mes", "nos", "notre", "on verra", "peut-être",
  "un peu", "hein", "ouais", "euh", "ben,", "quoi", "chez moi", "d'ailleurs",
  "à mon avis", "si tu veux", "va savoir", "tant pis", "du coup",
];

export const SENTENCE_START_CONNECTORS_FR: string[] = [
  "de plus", "en outre", "par ailleurs", "cependant", "toutefois", "néanmoins",
  "pourtant", "donc", "ainsi", "par conséquent", "en conséquence",
  "premièrement", "deuxièmement", "troisièmement", "en premier lieu",
  "en second lieu", "enfin", "d'une part", "d'autre part", "en effet",
  "de nos jours", "en particulier", "notamment", "de même", "de surcroît",
  "en définitive", "finalement", "pour résumer", "en résumé", "en conclusion",
  "il est important", "il convient", "il faut noter", "à cet égard",
  "dès lors", "de fait", "en revanche", "quant à", "en somme",
];

export const NON_SEULEMENT_REGEX = /non seulement\b([^.;!?]{2,120}?)\bmais (?:aussi|également)\b/giu;

// ---------- italiano ----------

export const AI_CLICHES_IT: ClicheRule[] = [
  { phrase: "nella società odierna", weight: 2, replacements: ["oggi"] },
  { phrase: "nel mondo di oggi", weight: 2, replacements: ["oggi"] },
  { phrase: "nel mondo attuale", weight: 2, replacements: ["oggi"] },
  { phrase: "nell'era digitale", weight: 2, replacements: ["oggi, con internet"] },
  { phrase: "ai giorni d'oggi", weight: 1.5, replacements: ["oggi"] },
  { phrase: "è importante notare che", weight: 2.5, replacements: ["va detto che", "occorre dire che"] },
  { phrase: "è importante sottolineare che", weight: 2.5, replacements: ["va sottolineato che", "bisogna dire che"] },
  { phrase: "vale la pena notare che", weight: 2, replacements: ["va detto che"] },
  { phrase: "è doveroso ricordare che", weight: 2, replacements: ["ricordiamo che"] },
  { phrase: "è fondamentale", weight: 1, replacements: ["serve", "è essenziale"] },
  { phrase: "è cruciale", weight: 1.5, replacements: ["è decisivo"] },
  { phrase: "gioca un ruolo cruciale", weight: 2, replacements: ["è decisivo", "conta molto"] },
  { phrase: "gioca un ruolo fondamentale", weight: 2, replacements: ["è decisivo"] },
  { phrase: "gioca un ruolo importante", weight: 1.5, replacements: ["conta molto"] },
  { phrase: "svolge un ruolo cruciale", weight: 2, replacements: ["è decisivo"] },
  { phrase: "svolge un ruolo fondamentale", weight: 2, replacements: ["è decisivo"] },
  { phrase: "svolge un ruolo importante", weight: 1.5, replacements: ["conta molto"] },
  { phrase: "in conclusione", weight: 2, replacements: ["alla fine", "in breve"] },
  { phrase: "in sintesi", weight: 1.5, replacements: ["in breve"] },
  { phrase: "in sostanza", weight: 1, replacements: ["in fondo"] },
  { phrase: "per concludere", weight: 2, replacements: ["per finire"] },
  { phrase: "in definitiva", weight: 1.5, replacements: ["alla fine"] },
  { phrase: "tuffiamoci in", weight: 2, replacements: ["entriamo in"] },
  { phrase: "esploriamo", weight: 1.5, replacements: ["diamo un'occhiata"] },
  { phrase: "svelare i segreti di", weight: 2, replacements: ["capire"] },
  { phrase: "sbloccare il potenziale", weight: 2, replacements: ["sfruttare al massimo"] },
  { phrase: "sfruttare la potenza di", weight: 2, replacements: ["tirare partito da"] },
  { phrase: "una miriade di", weight: 2, replacements: ["un sacco di"] },
  { phrase: "una pletora di", weight: 2, replacements: ["un sacco di"] },
  { phrase: "un'ampia gamma di", weight: 1.5, replacements: ["ogni tipo di"] },
  { phrase: "un'ampia varietà di", weight: 1.5, replacements: ["ogni tipo di"] },
  { phrase: "rivoluzionare", weight: 1, replacements: ["stravolgere"] },
  { phrase: "cambiamento di paradigma", weight: 1.5, replacements: ["cambio di fondo"] },
  { phrase: "all'avanguardia", weight: 1.5, replacements: ["in prima linea"] },
  { phrase: "senza soluzione di continuità", weight: 2, replacements: ["senza intoppi"] },
  { phrase: "le possibilità sono infinite", weight: 2, replacements: ["si può fare molto"] },
  { phrase: "una testimonianza di", weight: 1.5, replacements: ["una prova di"] },
  { phrase: "in questo articolo", weight: 1, replacements: ["qui"] },
  { phrase: "lungo questo articolo", weight: 2, replacements: ["in queste righe"] },
  { phrase: "va senza dire che", weight: 2, replacements: ["ovviamente"] },
  { phrase: "fare luce su", weight: 1.5, replacements: ["chiarire"] },
  { phrase: "aprire la strada a", weight: 1.5, replacements: ["preparare il terreno per"] },
  { phrase: "approccio olistico", weight: 1.5, replacements: ["visione d'insieme"] },
  { phrase: "ultimo ma non meno importante", weight: 2, replacements: ["infine"] },
  { phrase: "nel panorama di", weight: 1.5, replacements: ["nel mondo di"] },
  { phrase: "è innegabile che", weight: 2, replacements: ["è chiaro che"] },
  { phrase: "indubbiamente", weight: 1, replacements: ["senza dubbio"] },
];

export const HUMAN_MARKERS_IT: string[] = [
  "secondo me", "a dire il vero", "insomma", "dai,", "guarda", "io", "mi",
  "mio", "mia", "nostra", "ieri", "l'altro giorno", "la settimana scorsa",
  "sinceramente", "onestamente", "in pratica", "vabbè", "boh", "ehi", "mah,",
  "tipo", "un po'", "però", "magari", "chissà", "a mio avviso", "ti giuro",
  "figurati", "mmm", "ehilà", "dai su", "insisto", "ci mancherebbe",
];

export const SENTENCE_START_CONNECTORS_IT: string[] = [
  "inoltre", "peraltro", "tuttavia", "comunque", "pertanto", "quindi",
  "di conseguenza", "infatti", "in primo luogo", "in secondo luogo",
  "in terzo luogo", "infine", "da un lato", "dall'altro lato",
  "in particolare", "nello specifico", "nel frattempo", "ciò nondimeno",
  "ad esempio", "in definitiva", "in sostanza", "analogamente",
  "al contrario", "per concludere", "in conclusione", "in sintesi",
  "è importante", "va sottolineato", "occorre", "a questo proposito",
  "detto questo", "cioè", "ovvero", "in ogni caso",
];

export const NON_SOLO_IT_REGEX = /non solo\b([^.;!?]{2,120}?)\bma (?:anche|persino)\b/giu;

// ---------- portugués ----------

export const AI_CLICHES_PT: ClicheRule[] = [
  { phrase: "nos dias de hoje", weight: 1.5, replacements: ["hoje"] },
  { phrase: "na sociedade atual", weight: 2, replacements: ["hoje"] },
  { phrase: "no mundo atual", weight: 2, replacements: ["hoje"] },
  { phrase: "no mundo de hoje", weight: 2, replacements: ["hoje"] },
  { phrase: "na era digital", weight: 2, replacements: ["hoje, com a internet"] },
  { phrase: "é importante notar que", weight: 2.5, replacements: ["convém dizer que", "note-se que"] },
  { phrase: "é importante destacar que", weight: 2.5, replacements: ["convém sublinhar que"] },
  { phrase: "é importante ressaltar que", weight: 2.5, replacements: ["importa dizer que"] },
  { phrase: "cabe destacar que", weight: 2, replacements: ["convém sublinhar que"] },
  { phrase: "cabe ressaltar que", weight: 2, replacements: ["convém notar que"] },
  { phrase: "vale a pena mencionar", weight: 1.5, replacements: ["merece ser dito"] },
  { phrase: "é fundamental", weight: 1, replacements: ["é essencial"] },
  { phrase: "é crucial", weight: 1.5, replacements: ["é decisivo"] },
  { phrase: "desempenha um papel crucial", weight: 2, replacements: ["é decisivo"] },
  { phrase: "desempenha um papel fundamental", weight: 2, replacements: ["é decisivo"] },
  { phrase: "desempenha um papel importante", weight: 1.5, replacements: ["conta muito"] },
  { phrase: "joga um papel importante", weight: 1.5, replacements: ["conta muito"] },
  { phrase: "em conclusão", weight: 2, replacements: ["para terminar", "no fim"] },
  { phrase: "em resumo", weight: 1.5, replacements: ["resumindo"] },
  { phrase: "em suma", weight: 1.5, replacements: ["resumindo"] },
  { phrase: "para concluir", weight: 2, replacements: ["para terminar"] },
  { phrase: "mergulhe em", weight: 2, replacements: ["entre de cheio em"] },
  { phrase: "mergulhar em", weight: 1.5, replacements: ["entrar em"] },
  { phrase: "vamos explorar", weight: 2, replacements: ["vamos ver"] },
  { phrase: "desbloquear o potencial", weight: 2, replacements: ["tirar o máximo partido"] },
  { phrase: "aproveitar o poder de", weight: 2, replacements: ["tirar partido de"] },
  { phrase: "uma infinidade de", weight: 2, replacements: ["um monte de"] },
  { phrase: "uma ampla gama de", weight: 1.5, replacements: ["todo tipo de"] },
  { phrase: "uma grande variedade de", weight: 1.5, replacements: ["todo tipo de"] },
  { phrase: "revolucionar", weight: 1, replacements: ["transformar por completo"] },
  { phrase: "mudança de paradigma", weight: 1.5, replacements: ["mudança de fundo"] },
  { phrase: "de ponta", weight: 1, replacements: ["mais recente"] },
  { phrase: "as possibilidades são infinitas", weight: 2, replacements: ["dá para fazer muito"] },
  { phrase: "um testemunho de", weight: 1.5, replacements: ["uma prova de"] },
  { phrase: "no coração de", weight: 1, replacements: ["em pleno"] },
  { phrase: "neste artigo", weight: 1, replacements: ["aqui"] },
  { phrase: "ao longo deste artigo", weight: 2, replacements: ["nestas linhas"] },
  { phrase: "sem sombra de dúvidas", weight: 2, replacements: ["sem dúvida"] },
  { phrase: "é inegável que", weight: 2, replacements: ["é claro que"] },
  { phrase: "lançar luz sobre", weight: 1.5, replacements: ["esclarecer"] },
  { phrase: "abrir caminho para", weight: 1.5, replacements: ["preparar o terreno para"] },
  { phrase: "abordagem holística", weight: 1.5, replacements: ["visão global"] },
  { phrase: "em última análise", weight: 1.5, replacements: ["no fim das contas"] },
  { phrase: "não há como negar", weight: 1.5, replacements: ["é claro que"] },
  { phrase: "de vital importância", weight: 2, replacements: ["muito importante"] },
  { phrase: "no cenário de", weight: 1.5, replacements: ["no mundo de"] },
];

export const HUMAN_MARKERS_PT: string[] = [
  "na minha opinião", "pra ser sincero", "sinceramente", "é que", "bom,",
  "olha", "né", "tipo", "acho que", "pelo menos", "ontem", "anteontem",
  "semana passada", "outro dia", "eu", "meu", "minha", "nossa", "a gente",
  "tá", "tá bom", "puxa", "caramba", "um pouco", "até que", "confesso",
  "pra mim", "na real", "vou te falar", "pasmem", "imagina", "oba",
];

export const SENTENCE_START_CONNECTORS_PT: string[] = [
  "além disso", "ademais", "no entanto", "porém", "todavia", "contudo",
  "entretanto", "portanto", "por conseguinte", "consequentemente",
  "em primeiro lugar", "em segundo lugar", "em terceiro lugar", "por fim",
  "por um lado", "por outro lado", "de fato", "com efeito", "em particular",
  "nomeadamente", "especificamente", "enquanto isso", "ainda assim",
  "por exemplo", "em suma", "em síntese", "para concluir", "finalmente",
  "da mesma forma", "igualmente", "é importante", "cabe destacar",
  "a esse respeito", "ou seja", "digamos", "aliás",
];

export const NAO_APENAS_REGEX = /não (?:apenas|somente|só)\b([^.;!?]{2,120}?)\bmas (?:também|como)\b/giu;

// ---------- alemán ----------

export const AI_CLICHES_DE: ClicheRule[] = [
  { phrase: "in der heutigen Zeit", weight: 2, replacements: ["heutzutage", "heute"] },
  { phrase: "in der heutigen Welt", weight: 2, replacements: ["heute"] },
  { phrase: "in der modernen Welt", weight: 2, replacements: ["heute"] },
  { phrase: "im digitalen Zeitalter", weight: 2, replacements: ["heute, im Internetzeitalter"] },
  { phrase: "in der heutigen Gesellschaft", weight: 2, replacements: ["heute"] },
  { phrase: "es ist wichtig zu beachten, dass", weight: 2.5, replacements: ["wichtig ist:", "man sollte wissen:"] },
  { phrase: "es ist wichtig zu betonen, dass", weight: 2.5, replacements: ["betont werden muss:"] },
  { phrase: "es ist wichtig hervorzuheben, dass", weight: 2, replacements: ["hervorzuheben ist:"] },
  { phrase: "es lohnt sich zu erwähnen", weight: 1.5, replacements: ["erwähnenswert ist"] },
  { phrase: "es ist erwähnenswert, dass", weight: 1.5, replacements: ["erwähnenswert ist:"] },
  { phrase: "ist von entscheidender Bedeutung", weight: 2.5, replacements: ["entscheidend", "wichtig"] },
  { phrase: "spielt eine entscheidende Rolle", weight: 2.5, replacements: ["ist entscheidend", "zählt sehr"] },
  { phrase: "spielt eine wichtige Rolle", weight: 2, replacements: ["zählt viel"] },
  { phrase: "spielt eine zentrale Rolle", weight: 2, replacements: ["ist zentral"] },
  { phrase: "Abschließend lässt sich sagen", weight: 2, replacements: ["Alles in allem"] },
  { phrase: "zusammenfassend lässt sich sagen", weight: 2, replacements: ["kurz gesagt"] },
  { phrase: "zum Schluss", weight: 1, replacements: ["zum Ende"] },
  { phrase: "eintauchen in", weight: 1.5, replacements: ["sich stürzen in"] },
  { phrase: "das volle Potenzial ausschöpfen", weight: 2, replacements: ["das Beste herausholen"] },
  { phrase: "das Potenzial freisetzen", weight: 2, replacements: ["das Beste rausholen"] },
  { phrase: "eine Vielzahl von", weight: 1.5, replacements: ["viele", "eine Menge"] },
  { phrase: "eine breite Palette von", weight: 1.5, replacements: ["allerlei", "viele Arten von"] },
  { phrase: "eine Fülle von", weight: 1.5, replacements: ["eine Menge"] },
  { phrase: "revolutionieren", weight: 1, replacements: ["auf den Kopf stellen"] },
  { phrase: "Paradigmenwechsel", weight: 1.5, replacements: ["grundsätzlicher Wandel"] },
  { phrase: "auf dem neuesten Stand", weight: 1, replacements: ["modern"] },
  { phrase: "nahtlos", weight: 1.5, replacements: ["problemlos", "ohne Umwege"] },
  { phrase: "ganzheitlich", weight: 1.5, replacements: ["umfassend"] },
  { phrase: "die Möglichkeiten sind endlos", weight: 2, replacements: ["man kann viel machen"] },
  { phrase: "unendliche Möglichkeiten", weight: 2, replacements: ["viele Möglichkeiten"] },
  { phrase: "eine glänzende Zukunft", weight: 1.5, replacements: ["die Zukunft sieht gut aus"] },
  { phrase: "im Herzen von", weight: 1, replacements: ["mitten in"] },
  { phrase: "in diesem Artikel", weight: 1, replacements: ["hier"] },
  { phrase: "im Laufe dieses Artikels", weight: 2, replacements: ["in diesen Zeilen"] },
  { phrase: "es versteht sich von selbst", weight: 2, replacements: ["offensichtlich"] },
  { phrase: "Licht ins Dunkel bringen", weight: 1.5, replacements: ["Klarheit bringen"] },
  { phrase: "den Weg ebnen für", weight: 1.5, replacements: ["die Grundlage legen für"] },
  { phrase: "von größter Bedeutung", weight: 2, replacements: ["sehr wichtig"] },
  { phrase: "von zentraler Bedeutung", weight: 2, replacements: ["zentral"] },
  { phrase: "zu guter Letzt", weight: 1.5, replacements: ["zum Schluss"] },
  { phrase: "in der Landschaft von", weight: 1.5, replacements: ["in der Welt von"] },
];

export const HUMAN_MARKERS_DE: string[] = [
  "ich denke", "ich glaube", "ich meine", "ehrlich gesagt", "naja", "also",
  "eigentlich", "irgendwie", "quasi", "halt", "eben", "gestern", "letzte Woche",
  "neulich", "kürzlich", "ich", "mir", "mich", "mein", "meine", "uns",
  "unser", "wahrscheinlich", "zugegeben", "gut,", "schau mal", "ein bisschen",
  "sowas", "krass", "ach herrje", "na gut", "unter uns", "zugegeben",
];

export const SENTENCE_START_CONNECTORS_DE: string[] = [
  "außerdem", "des Weiteren", "ferner", "jedoch", "allerdings", "dennoch",
  "trotzdem", "deshalb", "daher", "deswegen", "folglich", "somit",
  "erstens", "zweitens", "drittens", "zuletzt", "abschließend",
  "einerseits", "andererseits", "insbesondere", "namentlich",
  "währenddessen", "beispielsweise", "zum Beispiel", "letztlich",
  "im Wesentlichen", "tatsächlich", "ähnlich", "im Gegensatz dazu",
  "zusammenfassend", "es ist wichtig", "hervorzuheben ist",
  "in dieser Hinsicht", "darüber hinaus", "kurz gesagt", "im Grunde",
];

export const NICHT_NUR_REGEX = /nicht nur\b([^.;!?]{2,120}?)\bsondern auch\b/giu;

// ---------- detección de idioma ----------

const STOPWORDS_BY_LANG: Record<Lang, string[]> = {
  es: [
    "el", "los", "las", "que", "del", "pero", "más", "también", "cuando",
    "porque", "para", "con", "una", "uno", "este", "esta", "eso", "sin",
    "sobre", "entre", "año", "años", "sus", "ya", "como", "está", "él",
    "ellos", "nosotros", "muy", "sí", "dos", "hasta", "desde", "todo", "todos",
  ],
  en: [
    "the", "and", "of", "to", "in", "is", "that", "for", "with", "as", "was",
    "on", "are", "by", "this", "be", "from", "or", "an", "which", "it", "at",
    "not", "but", "has", "have", "had", "were", "their", "they", "we", "you",
  ],
  fr: [
    "les", "des", "est", "dans", "pour", "qui", "ne", "pas", "sur", "avec",
    "plus", "être", "cette", "au", "aux", "vous", "tout", "était", "elle",
    "ils", "elles", "ça", "on", "sont", "leur", "nos", "vos", "comme", "mais",
    "aussi", "peut", "faire", "dont", "chez", "sans",
  ],
  it: [
    "che", "il", "lo", "gli", "della", "dei", "sono", "anche", "più", "come",
    "ma", "nella", "questo", "questa", "essere", "hanno", "siamo", "non",
    "però", "già", "molto", "ogni", "dallo", "nello", "con", "per", "una",
    "suo", "sua", "quello", "quella", "ciò", "senza", "molto",
  ],
  pt: [
    "não", "os", "as", "dos", "das", "do", "da", "pelo", "pela", "até", "são",
    "isso", "esse", "essa", "você", "muito", "mas", "também", "quando",
    "porque", "para", "com", "uma", "um", "mais", "como", "está", "seu",
    "sua", "pelo", "nos", "pela", "ser", "sem", "muito",
  ],
  de: [
    "der", "die", "das", "und", "ist", "den", "von", "zu", "mit", "sich",
    "auf", "für", "nicht", "ein", "eine", "als", "auch", "werden", "wird",
    "oder", "aber", "bei", "um", "haben", "hat", "sind", "über", "nach",
    "wie", "nur", "noch", "durch", "aus", "dem", "des", "im", "dass",
    "kann", "wurde", "bei",
  ],
};

// Terminaciones muy características de cada idioma (señal fuerte)
const SUFFIX_HINTS: { re: RegExp; lang: Lang; points: number; cap: number }[] = [
  { re: /ción\b|ciones\b/g, lang: "es", points: 2, cap: 6 },
  { re: /ção\b|ções\b/g, lang: "pt", points: 3, cap: 6 },
  { re: /zione\b|zioni\b/g, lang: "it", points: 3, cap: 6 },
  { re: /heit\b|keit\b|ungen\b|ung\b/g, lang: "de", points: 2, cap: 6 },
  { re: /tion\b|tions\b/g, lang: "fr", points: 1, cap: 3 },
  { re: /tion\b|tions\b/g, lang: "en", points: 1, cap: 3 },
];

/** Detecta el idioma del texto por frecuencia de palabras funcionales (es|en|fr|it|pt|de) */
export function detectLanguage(text: string): Lang {
  const sample = text.slice(0, 4000).toLowerCase();
  const m = sample.match(/[\p{L}']+/gu) || [];
  const score: Record<Lang, number> = { es: 0, en: 0, fr: 0, it: 0, pt: 0, de: 0 };
  for (const w of m) {
    for (const lang of Object.keys(STOPWORDS_BY_LANG) as Lang[]) {
      if (STOPWORDS_BY_LANG[lang].includes(w)) score[lang]++;
    }
  }
  for (const hint of SUFFIX_HINTS) {
    const hits = (sample.match(hint.re) || []).length;
    if (hits > 0) score[hint.lang] += Math.min(hint.cap, hits * hint.points);
  }
  // desempate: diacríticos y signos característicos
  const count = (re: RegExp) => (sample.match(re) || []).length;
  score.es += Math.min(6, count(/[ñ¿¡]/g) * 3);
  score.de += Math.min(6, count(/[äöüß]/g) * 3);
  score.pt += Math.min(6, count(/[ãõ]/g) * 3);
  score.fr += Math.min(4, count(/[àèùêâôîœ]/g) * 2);
  // "è" como palabra suelta ("es" en italiano) es muy italiana
  score.it += Math.min(3, count(/(^|\s)è(\s|$)/g) * 3);
  // ganador (prioridad al orden clásico si hay empate)
  const order: Lang[] = ["es", "en", "fr", "it", "pt", "de"];
  let best: Lang = "es";
  let bestScore = -1;
  for (const lang of order) {
    if (score[lang] > bestScore) {
      best = lang;
      bestScore = score[lang];
    }
  }
  return best;
}

// ---------- mapas por idioma (detector y humanizador) ----------

export const LANG_NAMES: Record<Lang, string> = {
  es: "español",
  en: "inglés",
  fr: "francés",
  it: "italiano",
  pt: "portugués",
  de: "alemán",
};

export const CLICHES_BY_LANG: Record<Lang, ClicheRule[]> = {
  es: AI_CLICHES,
  en: AI_CLICHES_EN,
  fr: AI_CLICHES_FR,
  it: AI_CLICHES_IT,
  pt: AI_CLICHES_PT,
  de: AI_CLICHES_DE,
};

export const HUMAN_MARKERS_BY_LANG: Record<Lang, string[]> = {
  es: HUMAN_MARKERS,
  en: HUMAN_MARKERS_EN,
  fr: HUMAN_MARKERS_FR,
  it: HUMAN_MARKERS_IT,
  pt: HUMAN_MARKERS_PT,
  de: HUMAN_MARKERS_DE,
};

export const CONNECTORS_BY_LANG: Record<Lang, string[]> = {
  es: SENTENCE_START_CONNECTORS,
  en: SENTENCE_START_CONNECTORS_EN,
  fr: SENTENCE_START_CONNECTORS_FR,
  it: SENTENCE_START_CONNECTORS_IT,
  pt: SENTENCE_START_CONNECTORS_PT,
  de: SENTENCE_START_CONNECTORS_DE,
};

/** Estructura paralela "no solo X sino también Y" de cada idioma */
export const STRUCT_REGEX_BY_LANG: Record<Lang, RegExp> = {
  es: NO_SOLO_REGEX,
  en: NOT_ONLY_REGEX,
  fr: NON_SEULEMENT_REGEX,
  it: NON_SOLO_IT_REGEX,
  pt: NAO_APENAS_REGEX,
  de: NICHT_NUR_REGEX,
};

export const STRUCT_LABEL_BY_LANG: Record<Lang, string> = {
  es: "no solo … sino también",
  en: "not only … but also",
  fr: "non seulement … mais aussi",
  it: "non solo … ma anche",
  pt: "não apenas … mas também",
  de: "nicht nur …, sondern auch",
};

/** Cola usada al deshacer la estructura paralela: "X" + cola + "Y" */
export const STRUCT_TAIL_BY_LANG: Record<Lang, string> = {
  es: ", y también",
  en: ", and also",
  fr: ", et aussi",
  it: ", e anche",
  pt: ", e também",
  de: ", und auch",
};
