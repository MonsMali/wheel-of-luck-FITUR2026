// Fun facts about Algarve to display on win screen
// All in Spanish for FITUR Madrid audience

export const ALGARVE_FACTS: string[] = [
  "El Algarve tiene más de 300 días de sol al año, ¡uno de los destinos más soleados de Europa!",
  "La Cueva de Benagil es una de las cuevas marinas más impresionantes del mundo.",
  "El Algarve cuenta con más de 150 km de costa con playas espectaculares.",
  "La Ponta da Piedade en Lagos tiene formaciones rocosas de más de 20 millones de años.",
  "El Algarve produce algunos de los mejores vinos de Portugal, especialmente en la región de Lagoa.",
  "La Ría Formosa es un parque natural con más de 18.000 hectáreas de belleza única.",
  "Sagres fue el centro de navegación del Príncipe Enrique el Navegante en el siglo XV.",
  "El Algarve es famoso por sus almendros en flor, que pintan el paisaje de blanco en febrero.",
  "Faro, la capital del Algarve, tiene un casco antiguo amurallado del siglo IX.",
  "Las cataplanas, guisos tradicionales de mariscos, son originarias del Algarve.",
  "El Algarve tiene 42 campos de golf de clase mundial.",
  "La Serra de Monchique alcanza los 902 metros y ofrece vistas hasta el océano.",
  "Tavira es conocida como la 'Venecia del Algarve' por sus puentes sobre el río Gilão.",
  "El percebe, un manjar del Algarve, se recolecta en los acantilados más peligrosos.",
  "Silves fue la capital árabe del Algarve y conserva un impresionante castillo rojo.",
  "Las aguas del Algarve son perfectas para avistar delfines y observar aves marinas.",
  "El Cabo de San Vicente es el punto más suroccidental de Europa continental.",
  "La tradición de las chimeneas decoradas es única del Algarve.",
  "Olhão es el puerto pesquero más importante del Algarve, famoso por su arquitectura cubista.",
  "El Algarve tiene más de 100 playas galardonadas con Bandera Azul.",
];

export function getRandomFact(): string {
  const index = Math.floor(Math.random() * ALGARVE_FACTS.length);
  return ALGARVE_FACTS[index];
}
