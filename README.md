# North Chrome | Control Operacional

Sistema de gestión integral (ERP/MRP) diseñado específicamente para **maestranzas y talleres industriales**. Esta aplicación web permite un control total sobre el flujo productivo, desde la creación de una Orden de Trabajo (OT) hasta la entrega final, pasando por el control de inventario y gestión de herramientas.

## 🚀 Funcionalidades Principales

### 🏭 Producción y OTs
*   **Gestión de Órdenes de Trabajo:** Ciclo de vida completo (Pendiente, En Proceso, Finalizado).
*   **Vista Kanban:** Tablero visual interactivo para gestionar el flujo de trabajo en planta.
*   **Hoja de Ruta Profesional:** Generación automática de documentos imprimibles para taller (oculta interfaz, muestra solo datos técnicos y códigos de barras simulados).
*   **Control de Costos:** Seguimiento en tiempo real de Materiales, Horas Hombre (HH) y Servicios Externos por OT.

### 📦 Logística y Pañol
*   **Inventario:** Control de stock con alertas críticas, Kardex de movimientos y valorización.
*   **Carga Masiva:** Importación y exportación de inventario vía Excel.
*   **Pañol Digital:** Sistema de préstamo y devolución de herramientas con control de estado (Disponible, En Uso, Mantención).

### 📊 Gestión y Reportes
*   **Dashboard Inteligente:** KPIs en tiempo real adaptados al rol del usuario (Gerencia, Técnico, Bodega).
*   **Seguridad:** Control de acceso basado en roles (RBAC).
*   **Modo Oscuro:** Interfaz adaptativa Light/Dark mode.

## 🛠️ Stack Tecnológico

*   **Core:** React 18 + TypeScript + Vite
*   **Estilos:** Tailwind CSS
*   **Gráficos:** Recharts
*   **Iconos:** Lucide React
*   **Utilidades:** Date-fns, XLSX
*   **Persistencia:** LocalStorage (Demo mode)

## 🔑 Credenciales de Acceso (Demo)

El sistema cuenta con usuarios pre-cargados para probar los distintos roles:

| Rol | Email | Contraseña | Acceso |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@northchrome.cl` | `admin` | Total |
| **Jefe Planta** | `jefe@northchrome.cl` | `user` | Gestión y Reportes |
| **Bodega** | `bodega@northchrome.cl` | `user` | Inventario y Pañol |
| **Técnico** | `tech@northchrome.cl` | `user` | Vista Operativa |

## 💻 Instalación y Despliegue

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Iniciar servidor de desarrollo:**
    ```bash
    npm run dev
    ```

3.  **Construir para producción:**
    ```bash
    npm run build
    ```

---
*Desarrollado para optimizar procesos industriales.*
