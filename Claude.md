# CLAUDE.md

## Proyecto: Sistema Contable Empresarial

### Descripción General
Desarrollar un sistema contable web moderno tomando como referencia las funcionalidades principales del sistema contable Saint.  
El sistema debe ser escalable, seguro, intuitivo y preparado para empresas pequeñas y medianas.

El objetivo es construir una plataforma contable robusta que permita gestionar operaciones financieras, registros contables y generación automática de reportes financieros.

---

# Objetivos del Sistema

- Automatizar procesos contables.
- Centralizar la información financiera.
- Generar reportes contables en tiempo real.
- Facilitar auditorías y revisiones financieras.
- Permitir escalabilidad modular futura.

---

# Funcionalidades Principales

## 1. Plan de Cuentas

### Descripción
Módulo encargado de administrar la estructura contable de la empresa.

### Funcionalidades
- Crear cuentas contables.
- Editar cuentas contables.
- Eliminar cuentas.
- Activar/Inactivar cuentas.
- Clasificación jerárquica:
  - Activos
  - Pasivos
  - Patrimonio
  - Ingresos
  - Gastos
  - Costos
- Soporte para subcuentas.
- Código único por cuenta.
- Naturaleza de la cuenta:
  - Deudora
  - Acreedora
- Búsqueda rápida de cuentas.
- Importación/exportación de catálogo.

### Reglas
- No permitir cuentas duplicadas.
- Validar estructura jerárquica.
- No eliminar cuentas con movimientos.

---

## 2. Asientos Contables

### Descripción
Registro de operaciones financieras mediante partidas dobles.

### Funcionalidades
- Crear asientos manuales.
- Editar asientos.
- Anular asientos.
- Numeración automática.
- Fecha contable.
- Concepto o descripción.
- Agregar múltiples líneas:
  - Cuenta
  - Debe
  - Haber
- Balance automático del asiento.
- Adjuntar documentos.
- Estados:
  - Borrador
  - Confirmado
  - Anulado
- Auditoría de cambios.

### Validaciones
- Debe = Haber.
- No permitir asientos desbalanceados.
- Validar cuentas activas.
- Bloqueo de períodos cerrados.

---

## 3. Mayor Analítico

### Descripción
Consulta detallada de movimientos por cuenta contable.

### Funcionalidades
- Filtrar por:
  - Cuenta
  - Fecha
  - Centro de costo
- Mostrar:
  - Fecha
  - Referencia
  - Descripción
  - Débito
  - Crédito
  - Saldo acumulado
- Exportar:
  - PDF
  - Excel
- Impresión directa.

---

## 4. Libro Diario

### Descripción
Reporte cronológico de todos los asientos contables registrados.

### Funcionalidades
- Consultar movimientos por rango de fechas.
- Mostrar:
  - Número de asiento
  - Fecha
  - Concepto
  - Cuentas afectadas
  - Débitos y créditos
- Exportación PDF/Excel.
- Impresión.

### Requisitos
- Orden cronológico obligatorio.
- Integridad contable.

---

## 5. Balance General

### Descripción
Generación automática del estado de situación financiera.

### Funcionalidades
- Mostrar:
  - Activos
  - Pasivos
  - Patrimonio
- Balance comparativo.
- Filtros por período.
- Exportación PDF/Excel.
- Vista gráfica opcional.

### Fórmula Base
Activo = Pasivo + Patrimonio

### Validaciones
- Balance cuadrado automáticamente.
- Consolidación de cuentas hijas.

---

## 6. Estado de Resultados

### Descripción
Reporte financiero de ingresos, costos y gastos.

### Funcionalidades
- Mostrar:
  - Ingresos
  - Costos
  - Gastos
  - Utilidad/Pérdida
- Comparativo mensual/anual.
- Exportación PDF/Excel.
- Gráficos financieros.

### Fórmula Base
Utilidad = Ingresos - Gastos - Costos

---

# Funcionalidades Adicionales Recomendadas

## Seguridad
- Inicio de sesión.
- Roles y permisos.
- Bitácora de auditoría.
- Recuperación de contraseña.
- JWT/Auth segura.

## Administración
- Gestión de usuarios.
- Configuración fiscal.
- Gestión de períodos contables.
- Apertura y cierre fiscal.

## Reportes
- Exportación:
  - PDF
  - Excel
  - CSV
- Impresión.
- Reportes dinámicos.

## Dashboard
- Resumen financiero.
- Indicadores:
  - Ingresos
  - Gastos
  - Utilidad
  - Flujo de caja
- Gráficos interactivos.

---

# Arquitectura Recomendada

## Frontend
- React.js / Next.js
- TailwindCSS
- TypeScript

## Backend
- Node.js + Express
- NestJS (recomendado)

## Base de Datos
- PostgreSQL

## ORM
- Prisma ORM

## Autenticación
- JWT
- Refresh Tokens

## Infraestructura
- Docker
- VPS o Cloud
- CI/CD

---

# Estructura Base de Módulos

/modules
  /auth
  /usuarios
  /plan-cuentas
  /asientos
  /mayor-analitico
  /libro-diario
  /balance-general
  /estado-resultados
  /reportes
  /dashboard

---

# Requerimientos Técnicos

## Rendimiento
- Consultas optimizadas.
- Paginación.
- Caché de reportes.

## Seguridad
- Encriptación de contraseñas.
- Protección CSRF/XSS.
- Validaciones backend/frontend.

## Escalabilidad
- Arquitectura modular.
- APIs RESTful.
- Preparado para microservicios.

---

# Requerimientos UX/UI

- Interfaz moderna.
- Responsive.
- Navegación rápida.
- Tema claro/oscuro.
- Dashboard intuitivo.

---

# Posibles Módulos Futuros

- Facturación.
- Inventario.
- Bancos.
- Nómina.
- Cuentas por cobrar.
- Cuentas por pagar.
- Integración tributaria.
- Multiempresa.
- Multiusuario avanzado.

---

# Flujo Básico del Sistema

1. Crear plan de cuentas.
2. Registrar asientos contables.
3. Generar movimientos.
4. Consultar mayor analítico.
5. Generar libro diario.
6. Generar balance general.
7. Generar estado de resultados.

---

# Prioridad de Desarrollo

## Fase 1
- Autenticación.
- Plan de cuentas.
- Asientos contables.

## Fase 2
- Mayor analítico.
- Libro diario.

## Fase 3
- Balance general.
- Estado de resultados.

## Fase 4
- Dashboard.
- Reportes avanzados.
- Auditoría.

---

# Objetivo Final

Construir un sistema contable profesional inspirado en Saint, moderno, escalable y preparado para futuras integraciones empresariales.