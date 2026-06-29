# vacan

vacan es un editor open source inspirado en Canva. El primer objetivo es tener un canvas central, subir imagenes y empezar a manipularlas como capas.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- shadcn/ui
- Convex
- React Konva / Konva para el motor de canvas

## Funcionalidades basicas tipo Canva

- Subir imagenes y organizarlas como capas.
- Mover, escalar, rotar y ajustar opacidad.
- Recortar imagenes y aplicar mascaras.
- Agregar texto editable con fuentes y estilos.
- Formas basicas, lineas, iconos y stickers.
- Plantillas con tamanos para redes sociales.
- Alinear, distribuir, agrupar y bloquear capas.
- Historial de deshacer/rehacer.
- Filtros de brillo, contraste, saturacion y blur.
- Exportar PNG/JPG/PDF.
- Guardar proyectos y versiones.
- Colaboracion en tiempo real con Convex.
- Biblioteca de assets reutilizables.

## Estado actual

El MVP inicial incluye:

- Canvas blanco cuadrado de 4096 x 4096.
- Upload local de imagenes.
- Capas seleccionables y arrastrables.
- Resize y rotacion con handles.
- Inspector para nombre, posicion, rotacion y opacidad.
- Duplicar, eliminar y exportar PNG.
- Boilerplate de Convex con tabla `projects`.

## Desarrollo

```bash
npm install
npm run dev
```

Para conectar Convex:

```bash
cp .env.example .env.local
npx convex dev
```

Luego copia la URL de Convex en `VITE_CONVEX_URL`.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run convex:dev
```

No hay despliegue configurado todavia.
