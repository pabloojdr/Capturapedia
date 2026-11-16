// Recuperar la última sección activa o por defecto 'todos'
let seccionActual = localStorage.getItem('acnh_seccion_activa') || 'todos';

// Rellenar selector de horas de 00:00 a 23:00 de forma dinámica
const selectHora = document.getElementById('filtroHora');
for (let i = 0; i < 24; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.innerText = `${i.toString().padStart(2, '0')}:00 h`;
    selectHora.appendChild(option);
}

// Cargar capturas guardadas en el navegador (localStorage)
let capturados = JSON.parse(localStorage.getItem('acnh_capturados')) || {};

function guardarEstado() {
    localStorage.setItem('acnh_capturados', JSON.stringify(capturados));
}

// Cambiar de sección mediante las pestañas superiores
function cambiarSeccion(nuevaSeccion) {
    seccionActual = nuevaSeccion;
    
    // Guardar la sección activa en el localStorage
    localStorage.setItem('acnh_seccion_activa', nuevaSeccion);
    
    ['todos', 'bicho', 'pez', 'marina', 'arte', 'fosil'].forEach(sec => {
        const btn = document.getElementById(`btn-tab-${sec}`);
        if (btn) {
            if (sec === nuevaSeccion) {
                btn.className = "px-4 py-2 rounded-lg font-semibold text-sm transition bg-emerald-600 text-white shadow-md";
            } else {
                btn.className = "px-4 py-2 rounded-lg font-semibold text-sm transition bg-slate-800 hover:bg-slate-700 text-slate-300";
            }
        }
    });

    renderizarEspecies();
}

// Mostrar fecha y hora actual en la cabecera
function actualizarReloj() {
    const ahora = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const relojEl = document.getElementById('relojSistema');
    if (relojEl) {
        relojEl.innerText = `🕒 Reloj del Sistema: ${ahora.toLocaleDateString('es-ES', opciones)}`;
    }
}
actualizarReloj();

// Actualizar barra de progreso y contadores numéricos de la sección actual
function actualizarProgreso() {
    const listaFiltradaSeccion = seccionActual === 'todos' 
        ? especiesBase 
        : especiesBase.filter(e => e.tipo === seccionActual);

    const totalEspecies = listaFiltradaSeccion.length;
    const totalCapturadas = listaFiltradaSeccion.filter(esp => capturados[esp.id]).length;
    const porcentaje = totalEspecies > 0 ? Math.round((totalCapturadas / totalEspecies) * 100) : 0;

    const nombresSeccion = {
        'todos': 'Todo el Museo',
        'bicho': 'Colección de Bichos',
        'pez': 'Colección de Peces',
        'marina': 'Criaturas Marinas',
        'arte': 'Obras de Arte',
        'fosil': 'Fósiles'
    };

    const tituloEl = document.getElementById('tituloProgreso');
    const textoEl = document.getElementById('textoProgreso');
    const barraEl = document.getElementById('barraProgreso');

    if (tituloEl) tituloEl.innerText = `Progreso: ${nombresSeccion[seccionActual]}`;
    if (textoEl) textoEl.innerText = `${totalCapturadas} / ${totalEspecies} (${porcentaje}%)`;
    if (barraEl) barraEl.style.width = `${porcentaje}%`;
}

// Comprobación de disponibilidad temporal (meses y horas)
function cumpleFiltroTemporal(esp, hemisferio, mesFiltro, horaFiltro, modoAhora) {
    if (!esp.temporal) return true;

    const ahora = new Date();
    const mesEvaluado = mesFiltro === 'todos' ? (modoAhora ? ahora.getMonth() + 1 : null) : parseInt(mesFiltro);
    const horaEvaluada = horaFiltro === 'todos' ? (modoAhora ? ahora.getHours() : null) : parseInt(horaFiltro);

    // 1. Validar Mes
    if (mesEvaluado !== null && esp.mesesNorte) {
        const mesesValidos = hemisferio === 'norte' ? esp.mesesNorte : esp.mesesSur;
        if (mesesValidos && !mesesValidos.includes(mesEvaluado)) return false;
    }

    // 2. Validar Hora (Usando horario sur si aplica y estamos en hemisferio sur)
    const usaHorarioSur = (hemisferio === 'sur' && esp.horaInicioSur !== undefined);
    const hInicio = usaHorarioSur ? esp.horaInicioSur : esp.horaInicio;
    const hFin = usaHorarioSur ? esp.horaFinSur : esp.horaFin;

    if (horaEvaluada !== null && !esp.todoElDia && hInicio !== undefined) {
        if (hInicio < hFin) {
            if (!(horaEvaluada >= hInicio && horaEvaluada < hFin)) return false;
        } else {
            if (!(horaEvaluada >= hInicio || horaEvaluada < hFin)) return false;
        }
    }

    return true;
}

// Renderizar cuadrícula principal de especies con todos los filtros aplicados
function renderizarEspecies() {
    const grid = document.getElementById('gridEspecies');
    if (!grid) return;

    const textoBusqueda = document.getElementById('buscador')?.value.toLowerCase() || '';
    const hemisferioFiltro = document.getElementById('filtroHemisferio')?.value || 'norte';
    const estadoFiltro = document.getElementById('filtroEstado')?.value || 'todos';
    const tiempoFiltro = document.getElementById('filtroTiempo')?.value || 'todos';
    const mesFiltro = document.getElementById('filtroMes')?.value || 'todos';
    const horaFiltro = document.getElementById('filtroHora')?.value || 'todos';
    const ordenPrecio = document.getElementById('ordenPrecio')?.value || 'default';

    grid.innerHTML = '';

    // Filtrado de elementos
    let filtradas = especiesBase.filter(esp => {
        if (seccionActual !== 'todos' && esp.tipo !== seccionActual) return false;

        const coincideTexto = (esp.nombre && esp.nombre.toLowerCase().includes(textoBusqueda)) || 
                             (esp.ubicacion && esp.ubicacion.toLowerCase().includes(textoBusqueda));

        const estaCapturado = !!capturados[esp.id];
        let coincideEstado = true;
        if (estadoFiltro === 'pendientes') coincideEstado = !estaCapturado;
        if (estadoFiltro === 'capturados') coincideEstado = estaCapturado;

        let coincideTiempo = true;
        if (tiempoFiltro === 'ahora') {
            coincideTiempo = cumpleFiltroTemporal(esp, hemisferioFiltro, 'todos', 'todos', true);
        } else {
            coincideTiempo = cumpleFiltroTemporal(esp, hemisferioFiltro, mesFiltro, horaFiltro, false);
        }

        return coincideTexto && coincideEstado && coincideTiempo;
    });

    // Ordenación por precio
    if (ordenPrecio !== 'default') {
        filtradas.sort((a, b) => {
            const precioA = a.precio || 0;
            const precioB = b.precio || 0;
            return ordenPrecio === 'asc' ? precioA - precioB : precioB - precioA;
        });
    }

    // Actualizar barra y porcentajes
    actualizarProgreso();

    if (filtradas.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center text-slate-500 py-8">No se han encontrado elementos con esos filtros en esta sección.</p>`;
        return;
    }

    // Dibujar cada tarjeta
    filtradas.forEach(esp => {
        const estaCapturado = !!capturados[esp.id];
        const mesesArray = hemisferioFiltro === 'norte' ? (esp.mesesNorte || []) : (esp.mesesSur || []);
        const disponibleAhora = cumpleFiltroTemporal(esp, hemisferioFiltro, 'todos', 'todos', true);
        const textoHorasFinal = (hemisferioFiltro === 'sur' && esp.textoHorasSur) ? esp.textoHorasSur : esp.textoHoras;
        
        // Precios especiales de Kamilo (Flick) y C.J. (+50%)
        let htmlPreciosExtra = '';
        if (esp.tipo === 'bicho' && esp.precio) {
            const precioKamilo = Math.round(esp.precio * 1.5);
            htmlPreciosExtra += `<div class="text-amber-400 font-semibold text-xs mt-0.5">🦊 Kamilo: 💰 ${precioKamilo} bayas</div>`;
        } else if (esp.tipo === 'pez' && esp.precio) {
            const precioCJ = Math.round(esp.precio * 1.5);
            htmlPreciosExtra += `<div class="text-sky-400 font-semibold text-xs mt-0.5">🦫 C.J.: 💰 ${precioCJ} bayas</div>`;
        }

        const tiposEtiqueta = {
            'bicho': 'bg-amber-900/40 text-amber-300',
            'pez': 'bg-sky-900/40 text-sky-300',
            'marina': 'bg-teal-900/40 text-teal-300',
            'arte': 'bg-purple-900/40 text-purple-300',
            'fosil': 'bg-stone-800 text-stone-300'
        };

        // Construcción limpia de los detalles internos según los datos disponibles
        let detallesHtml = '';

        if (esp.tipo === 'arte') {
            // Campos específicos para Obras de Arte
            if (esp.autor) detallesHtml += `<p><strong>🎨 Autor:</strong> ${esp.autor}</p>`;
            if (esp.nombreReal) detallesHtml += `<p><strong>🏛️ Nombre real:</strong> ${esp.nombreReal}</p>`;
            if (esp.falsificacion) detallesHtml += `<p><strong>🔍 Falsificación:</strong> ${esp.falsificacion}</p>`;
            if (esp.precioVenta) {
                detallesHtml += `<div class="text-amber-400 font-semibold text-xs mt-1">🏷️ Precio de venta: 💰 ${esp.precioVenta} bayas</div>`;
            }
        } else if (esp.tipo === 'fosil') {
            // 🦴 NUEVO: Campo específico para el conjunto de los fósiles
            if (esp.conjunto) detallesHtml += `<p><strong>🦴 Conjunto:</strong> ${esp.conjunto}</p>`;
        } else {
            // Campos para Bichos, Peces y Criaturas Marinas
            if (esp.clima) detallesHtml += `<p><strong>🌤️ Clima:</strong> ${esp.clima}</p>`;
            if (esp.sombra) detallesHtml += `<p><strong>🌑 Sombra:</strong> ${esp.sombra}</p>`;
            if (esp.movimiento) detallesHtml += `<p><strong>🌊 Movimiento:</strong> ${esp.movimiento}</p>`;
            if (textoHorasFinal) detallesHtml += `<p><strong>⏰ Horas:</strong> ${textoHorasFinal}</p>`;
            if (esp.requisitos) detallesHtml += `<p><strong>📋 Requisitos:</strong> ${esp.requisitos}</p>`;
            if (esp.temporal && mesesArray.length > 0) {
                detallesHtml += `<p><strong>📅 Meses (${hemisferioFiltro}):</strong> Meses ${mesesArray.join(', ')}</p>`;
            }
        }

        const card = document.createElement('div');
        card.className = `bg-slate-800 border ${estaCapturado ? 'border-emerald-600/50 bg-slate-800/80' : 'border-slate-700'} rounded-xl p-5 shadow-md flex flex-col justify-between transition hover:border-slate-500`;
        
        card.innerHTML = `
            <div>
                <!-- 📸 IMAGEN LOCAL (Solo se muestra si el objeto tiene la ruta rellenada) -->
                ${esp.imagen ? `
                    <div class="w-full h-36 bg-slate-900 rounded-lg overflow-hidden mb-4 border border-slate-700/50 flex items-center justify-center">
                        <img src="${esp.imagen}" alt="${esp.nombre}" class="w-full h-full object-contain p-2" loading="lazy">
                    </div>
                ` : ''}

                <div class="flex justify-between items-start mb-3 gap-2">
                    <span class="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${tiposEtiqueta[esp.tipo] || 'bg-slate-700 text-slate-300'}">
                        ${esp.tipo}
                    </span>
                    <div class="flex items-center gap-2">
                        ${disponibleAhora && esp.temporal ? '<span class="text-xs bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded-full font-medium" title="Disponible ahora mismo">🟢 Disponible</span>' : ''}
                    </div>
                </div>
                
                <h3 class="text-xl font-bold text-white mb-1">${esp.nombre || "Sin nombre (Rellenar)"}</h3>
                <!-- Si es arte no muestra ubicación, para los demás muestra la ubicación o el texto por defecto -->
                <!-- No muestra ubicación si es arte o fósil, para lo demás muestra la ubicación o el texto por defecto -->
                ${(esp.tipo !== 'arte' && esp.tipo !== 'fosil') ? `<p class="text-sm text-slate-400 mb-3">📍 ${esp.ubicacion || "Ubicación pendiente"}</p>` : ''}
                
                
                <div class="mb-3 bg-slate-900/70 p-2.5 rounded-lg border border-slate-700/50">
                    <div class="text-emerald-400 font-semibold text-sm">💰 Tienda: ${esp.precio !== undefined ? esp.precio : 0} bayas</div>
                    ${htmlPreciosExtra}
                </div>

                <div class="text-xs text-slate-300 space-y-1 mb-4 bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                    ${detallesHtml}
                </div>
            </div>

            <button onclick="toggleCapturado(${esp.id})" 
                class="w-full py-2 px-4 rounded-lg font-medium text-sm transition ${estaCapturado ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}">
                ${estaCapturado ? '✓ Registrado' : 'Marcar como Conseguido'}
            </button>
        `;
        grid.appendChild(card);
    });
}

function toggleCapturado(id) {
    capturados[id] = !capturados[id];
    guardarEstado();
    renderizarEspecies();
}

// Vincular eventos en tiempo real para todos los filtros y buscador
['buscador', 'filtroHemisferio', 'filtroEstado', 'filtroTiempo', 'filtroMes', 'filtroHora', 'ordenPrecio'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', renderizarEspecies);
        el.addEventListener('change', renderizarEspecies);
    }
});

// Inicializar aplicando la sección guardada para que los botones se pinten bien
cambiarSeccion(seccionActual);