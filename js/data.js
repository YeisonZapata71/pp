// js/data.js
// Mock Database para Presupuestos y JACs

const globalBudgets = [
  { year: 2024, initialBudget: 1500000000, addition: 0, superavit: 0 },
  { year: 2025, initialBudget: 1800000000, addition: 15000000, superavit: 0 }, // Superavit is calculated dynamically now
  { year: 2026, initialBudget: 2200000000, addition: 50000000, superavit: 0 }
];

const mockJACs = [
  { id: 1, name: "JAC Barrio Central", year: 2026, assigned: 300000000, addition: 50000000, paid: 150000000, projects: 2 },
  { id: 2, name: "JAC Vereda El Totumo", year: 2026, assigned: 400000000, addition: 0, paid: 400000000, projects: 3 },
  { id: 3, name: "JAC Barrio San José", year: 2026, assigned: 250000000, addition: 20000000, paid: 50000000,  projects: 1 },
  { id: 4, name: "JAC Vereda Manga Arriba", year: 2026, assigned: 300000000, addition: 0, paid: 0, projects: 1 },
  
  { id: 5, name: "JAC Vereda San Andrés", year: 2025, assigned: 500000000, addition: 0, paid: 350000000, projects: 2 },
  { id: 6, name: "JAC Barrio Juan XXIII", year: 2025, assigned: 400000000, addition: 0, paid: 400000000, projects: 1 },
  { id: 7, name: "JAC Barrio Santa Ana", year: 2025, assigned: 600000000, addition: 50000000, paid: 500000000, projects: 4 },
];

const mockDirectoryJACs = [
  { id: 1, name: "JAC Barrio Central", zone: "Urbana", president: "María Pérez", phone: "3001234567" },
  { id: 2, name: "JAC Vereda El Totumo", zone: "Rural", president: "Juan Gómez", phone: "3109876543" },
  { id: 3, name: "JAC Barrio San José", zone: "Urbana", president: "Carlos Ramírez", phone: "3204567890" }
];

const mockProjects = [
  { id: 1, jacId: 1, title: "Renovación de Parque Central", description: "Mejora de bancas e iluminación", status: "Planificación", budget: 50000000, hasAddition: true, addition: 15000000, year: 2026, documents: [{name: 'Resolución_001.pdf', date: '2026-01-10'}], photos: [], notes: [{author:'Administrador Global', text:'Comité solicitó ajustes en planos', date:'2026-01-12'}] },
  { id: 2, jacId: 2, title: "Pavimentación placa huella", description: "Vereda El Totumo tramo 1", status: "En Ejecución", budget: 200000000, hasAddition: false, addition: 0, year: 2026, documents: [], photos: [], notes: [] },
  { id: 3, jacId: 1, title: "Dotación de equipos comunales", description: "Compra de sillas y mesas", status: "Finalizado", budget: 15000000, hasAddition: false, addition: 0, year: 2026, documents: [], photos: [], notes: [] },
  { id: 4, jacId: 3, title: "Cámaras de seguridad", description: "Instalación de circuito cerrado de TV comunal", status: "En Ejecución", budget: 35000000, hasAddition: false, addition: 0, year: 2026, documents: [], photos: [], notes: [] }
];

const mockPayments = [
  { id: 1, jacId: 1, amount: 150000000, date: "2026-02-15", description: "Anticipo de obra e inicio de contrato", year: 2026 },
  { id: 2, jacId: 2, amount: 400000000, date: "2026-03-10", description: "Pago total finalización placa huella", year: 2026 }
];

const mockUsers = [
  { id: 1, username: 'admin', password: '123', name: 'Alcalde General', role: 'admin' },
  { id: 2, username: 'gestor', password: '123', name: 'Gestor Operativo', role: 'gestor' }
];

