# 🎖️ Bot Ejército Nacional — Sistema Táctico Integral v2.0

Bot profesional y modular para Discord (Discord.js v14) diseñado para el control de servicio militar, gestión de expedientes disciplinarios, convocatorias de despliegue, sistema de tickets y auditoría en comunidades de rol táctico o clanes.

---

## ⚡ Novedades de la Versión 2.0 (Upgrade x100)

* **🛡️ Persistencia Indestructible (Capa Dual de Base de Datos):**
  - Conexión nativa a **PostgreSQL** para despliegues en **Railway** o Supabase (inmune a reinicios o caídas de contenedores).
  - Fallback automático a **SQLite local** (con WAL mode activado) para desarrollo sin conexión.
* **🎫 Sistema Integral de Tickets y Atención Militar:**
  - Despliegue interactivo mediante `/ticketpanel` con selector de departamentos (Soporte, Reclutamiento, Asuntos Internos, Alto Mando).
  - Canales privados automáticos con permisos aislados.
  - Reclamo de atención por oficiales (`Claim`), transcripciones automáticas al cerrar enviadas por MD y al canal de auditoría, y comandos `/ticket add` / `/ticket remove`.
* **⏸️ Sistema de Pausa / Descanso Militar:**
  - Los soldados pueden pausar su servicio táctico (ej. descansos, comida) para no inflar horas AFK falsas. El tiempo en pausa se descuenta automáticamente al salir de turno.
* **🚨 Corte Marcial Automática:**
  - Al acumular 3/3 advertencias en `/sancionar`, el sistema suspende de inmediato al infractor, lo expulsa de servicio activo y lo bloquea en la base de datos con alerta al Alto Mando.
  - Hoja de vida militar completa: rango, división, estado actual, horas semanales, horas históricas, condecoraciones y medallas.
* **📡 Convocatorias y Llamado a Filas (`/convocatoria`):**
  - Anuncio interactivo de operativos con botones de RSVP en tiempo real (`[✅ Asistiré]`, `[⏳ Retraso]`, `[❌ Ausente]`) y lista de contingente disponible.
* **💾 Copias de Seguridad Automáticas y Manuales (`/backup`):**
  - Volcados completos en formato JSON enviados a canales privados de auditoría militar.
* **🔒 Seguridad y Prevención de Errores:**
  - Menú de selección de soldados sin límite de 25 usuarios con `UserSelectMenuBuilder` nativo.
  - Diálogos de confirmación antes de cualquier reseteo total o individual de horas.
  - Centralización de permisos de Alto Mando en `core/config.js`.

---

## 🗄️ Configuración en Railway (Paso a Paso)

Para que tu base de datos **nunca más se borre al reiniciar el bot**:

1. Ve a tu proyecto en [Railway](https://railway.app/).
2. Haz clic en **`+ New`** -> **`Database`** -> **`Add PostgreSQL`**.
3. En la pestaña **Variables** del servicio de tu bot, Railway inyectará automáticamente `DATABASE_URL`.
4. ¡Listo! El bot detectará `DATABASE_URL` y activará el modo PostgreSQL en la nube de forma 100% automática.

---

## 📋 Lista de Comandos Barra (Slash Commands)

| Comando | Permiso | Descripción |
| :--- | :---: | :--- |
| `/crearticketseccion` | Mando | Abre modal para decorar panel con imágenes y busca/crea la categoría de Discord automáticamente. |
| `/ticketpanel [canal]` | Mando | Despliega el panel general de soporte con selector de categorías. |
| `/ticket close [razon]` | Todos / Mando | Cierra el ticket actual, genera transcripción y elimina el canal. |
| `/ticket claim` | Mando | Reclama la atención del ticket como oficial a cargo. |
| `/ticket add @usuario` | Mando | Añade a un soldado o miembro al ticket actual. |
| `/ticket remove @usuario` | Mando | Remueve a un miembro del ticket actual. |
| `/ticket transcript` | Mando | Genera y descarga la transcripción del ticket al instante. |
| `/expediente [soldado]` | Todos | Consulta la hoja de vida militar, horas y condecoraciones. |
| `/sancionar @soldado [razon] [pruebas]` | Mando | Aplica una sanción oficial con cálculo de advertencias y corte marcial. |
| `/convocatoria [titulo] [fecha] [detalles]` | Mando | Despliega un llamado a filas interactivo con confirmación de asistencia. |
| `/sendcenter #canal` | Mando | Emite comunicados oficiales en nombre del bot (Embed o Texto). |
| `/backup` | Mando | Genera y descarga un volcado JSON íntegro de la base de datos. |

---

## 🚀 Despliegue Local

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd Bot-Ejercito

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Completa tu DISCORD_TOKEN, CLIENT_ID y GUILD_ID en .env

# 4. Iniciar el bot
npm start
```

---

## 📁 Estructura del Código

```text
├── core/
│   ├── bot.js              # Inicialización del cliente Discord
│   ├── config.js           # Configuración centralizada y permisos
│   ├── config.modules.js   # Lista de módulos activos
│   ├── database.js         # Capa híbrida PostgreSQL / SQLite
│   └── loader.js           # Cargador dinámico de eventos y módulos
├── events/
│   ├── ready.js            # Registro de comandos y arranque limpio
│   └── interactionCreate.js# Enrutador global de comandos
├── modules/
│   ├── tickets/            # Sistema integral de tickets, reclamos y transcripciones
│   ├── hours/              # Turnos, pausas, live panel y scheduler
│   ├── sanctions/          # Sanciones, corte marcial y auditoría
│   ├── profiles/           # Expedientes militares y rangos (/expediente)
│   ├── tactical/           # Convocatorias tácticas (/convocatoria)
│   └── sendCenter/         # Centro de transmisiones oficiales
└── index.js                # Punto de entrada
```
