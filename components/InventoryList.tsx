import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext'; 
import { PERMISSIONS } from '../utils/roleUtils';
import { Icons } from './Icons';
import { SupplyDocument, SupplyDocType, SupplyItem, InventoryItem, Status, ConsumptionRecord, ConsumptionItem } from '../types';
import { formatDateTime, formatDate } from '../utils/dateUtils';
import * as XLSX from 'xlsx';

export const InventoryList: React.FC = () => {
  const { inventory, supplyDocuments, consumptionHistory, addSupplyDocument, addConsumption, bulkUpsertInventory, addDebugLog } = useApp();
  const { user } = useAuth();
  const { addToast } = useToast(); 
  const canEdit = user ? PERMISSIONS[user.role].canEditInventory : false;

  const [activeTab, setActiveTab] = useState<'STOCK' | 'RECEPTION' | 'DISPATCH'>('STOCK');
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  
  const [selectedItemIdForHistory, setSelectedItemIdForHistory] = useState<string | null>(null);
  const selectedItemForHistory = useMemo(() => inventory.find(i => i.id === selectedItemIdForHistory) || null, [inventory, selectedItemIdForHistory]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const handleExportPhysicalInventory = () => {
    addDebugLog('INFO', 'Generating Physical Inventory Excel export');
    const sortedInventory = [...inventory].sort((a, b) => (a.location || '').localeCompare(b.location || ''));
    const dataToExport = sortedInventory.map(item => ({ 'Ubicación': item.location, 'SKU': item.sku, 'Nombre del Item': item.name, 'Categoría': item.category, 'Unidad': item.unit, 'Stock Sistema': item.stock, 'CONTEO FÍSICO': '' }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Conteo Físico");
    XLSX.writeFile(workbook, `Planilla_Inv_Fisico_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast("Planilla exportada correctamente", "SUCCESS");
  };

  const handleDownloadTemplate = () => {
      const templateData = [{ sku: 'EJEMPLO-001', nombre: 'Nombre del Producto', categoria: 'General', stock: 10, min_stock: 5, unidad: 'un', ubicacion: 'A1', precio: 1000 }];
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
      XLSX.writeFile(workbook, "Plantilla_Carga_Inventario.xlsx");
      addToast("Plantilla descargada", "INFO");
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const binaryStr = event.target?.result;
        if (!binaryStr) return;
        try {
            const workbook = XLSX.read(binaryStr, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            if (jsonData.length === 0) { addToast('Archivo vacío.', 'ERROR'); return; }
            const mappedItems: Partial<InventoryItem>[] = jsonData.map((row: any) => {
                const findKey = (obj: any, key: string) => Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
                const getValue = (key: string) => row[findKey(row, key) || ''];
                return { sku: getValue('sku'), name: getValue('nombre'), category: getValue('categoría') || 'General', stock: Number(getValue('stock') || 0), minStock: Number(getValue('stock mínimo') || 0), unit: getValue('unidad') || 'un', location: getValue('ubicación'), price: Number(getValue('precio') || 0) };
            });
            if (mappedItems.length > 0 && window.confirm(`Procesar ${mappedItems.length} filas?`)) {
                const result = bulkUpsertInventory(mappedItems);
                addToast(`Carga: ${result.created} nuevos, ${result.updated} actualizados.`, 'SUCCESS');
            }
        } catch (error: any) { console.error(error); addToast('Error al procesar.', 'ERROR'); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const totalValue = inventory.reduce((acc, item) => acc + (item.stock * item.price), 0);
  const lowStockCount = inventory.filter(i => i.stock <= i.minStock).length;
  const totalItems = inventory.length;
  const uniqueCategories = ['ALL', ...Array.from(new Set(inventory.map(i => i.category)))];
  const filteredInventory = useMemo(() => inventory.filter(item => (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase())) && (selectedCategory === 'ALL' || item.category === selectedCategory)), [inventory, searchTerm, selectedCategory]);

  const KPICard = ({ title, value, icon: Icon, color, sub }: any) => (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4 transition-colors">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
            <Icon size={24} className={color.replace('bg-', 'text-').replace('-500', '-600')} />
        </div>
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{title}</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{value}</h3>
            {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Control de Inventario</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de existencias, valorización y abastecimiento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
             <div className="flex bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-1 mr-2">
                <button onClick={handleExportPhysicalInventory} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"><Icons.Orders size={16} /> Inv. Físico</button>
                <div className="w-px bg-slate-200 dark:bg-slate-700 my-0.5 mx-1"></div>
                <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"><Icons.Download size={16} /> Plantilla</button>
                <div className="w-px bg-slate-200 dark:bg-slate-700 my-0.5 mx-1"></div>
                <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"><Icons.Upload size={16} /> Cargar Masiva</button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
             </div>
            {canEdit && (
                <div className="flex gap-2">
                  <button onClick={() => setIsReceptionModalOpen(true)} className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-all"><Icons.Truck size={18} /> <span>Recepción</span></button>
                  <button onClick={() => setIsConsumptionModalOpen(true)} className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg hover:bg-amber-700 transition-all"><Icons.Consumption size={18} /> <span>Salida</span></button>
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="Valorización Total" value={`$${totalValue.toLocaleString()}`} icon={Icons.ShoppingBag} color="bg-emerald-500" sub="Costo actual en bodega" />
          <KPICard title="Items Críticos" value={lowStockCount} icon={Icons.Alert} color="bg-red-500" sub="Stock por debajo del mínimo" />
          <KPICard title="Total SKUs" value={totalItems} icon={Icons.Inventory} color="bg-blue-500" sub="Items únicos registrados" />
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex space-x-6">
            {[{id:'STOCK', label:'Existencias'}, {id:'RECEPTION', label:'Recepciones'}, {id:'DISPATCH', label:'Salidas'}].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === t.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{t.label}</button>
            ))}
          </div>
      </div>

      {activeTab === 'STOCK' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex overflow-x-auto pb-2 md:pb-0 hide-scrollbar space-x-1 w-full md:w-auto">
                    {uniqueCategories.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{cat === 'ALL' ? 'Todas' : cat}</button>
                    ))}
                </div>
                <div className="relative w-full md:w-64">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold">
                    <tr><th className="p-4">SKU / Categoría</th><th className="p-4">Descripción</th><th className="p-4 text-center">Ubicación</th><th className="p-4 text-right">Stock</th><th className="p-4 text-right">Precio</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Estado</th><th className="p-4 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredInventory.length === 0 ? (<tr><td colSpan={8} className="p-12 text-center text-slate-400 dark:text-slate-500">No se encontraron items.</td></tr>) : filteredInventory.map(item => {
                            const isCritical = item.stock <= item.minStock;
                            return (
                                <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${isCritical ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                                <td className="p-4"><div className="font-mono font-bold text-slate-700 dark:text-slate-200 text-sm">{item.sku}</div><div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">{item.category}</div></td>
                                <td className="p-4"><div className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</div><div className="text-xs text-slate-500 dark:text-slate-400">Min: {item.minStock} {item.unit}</div></td>
                                <td className="p-4 text-center"><span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono px-2 py-1 rounded border border-slate-200 dark:border-slate-700">{item.location}</span></td>
                                <td className="p-4 text-right"><div className={`font-bold text-sm ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>{item.stock} <span className="text-xs font-normal text-slate-500">{item.unit}</span></div></td>
                                <td className="p-4 text-right font-mono text-sm text-slate-600 dark:text-slate-400">${item.price.toLocaleString()}</td>
                                <td className="p-4 text-right font-mono font-bold text-sm text-slate-800 dark:text-slate-200">${(item.stock * item.price).toLocaleString()}</td>
                                <td className="p-4 text-center">{isCritical ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Crítico</span> : <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Normal</span>}</td>
                                <td className="p-4 text-right"><button onClick={() => setSelectedItemIdForHistory(item.id)} className="text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 p-2 rounded-lg"><Icons.History size={16} /></button></td>
                                </tr>
                            );
                        })}
                </tbody>
                </table>
            </div>
          </div>
      )}

      {activeTab === 'RECEPTION' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"><h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Registro de Documentos</h3></div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold">
                        <tr><th className="p-4">Folio</th><th className="p-4">Ref</th><th className="p-4">Proveedor</th><th className="p-4">Fecha</th><th className="p-4 text-right">Monto</th><th className="p-4">Usuario</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {supplyDocuments.map(doc => (
                            <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{doc.id}</td>
                                <td className="p-4 text-sm font-bold text-slate-800 dark:text-white">{doc.type} #{doc.externalReference}</td>
                                <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{doc.provider}</td>
                                <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(doc.date)}</td>
                                <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-slate-200">${doc.totalAmount.toLocaleString()}</td>
                                <td className="p-4 text-xs text-slate-500">{doc.receivedBy}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
      )}

      {activeTab === 'DISPATCH' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"><h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Salidas de Bodega</h3></div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold">
                        <tr><th className="p-4">Folio</th><th className="p-4">Fecha</th><th className="p-4">OT</th><th className="p-4">Técnico</th><th className="p-4 text-right">Costo</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {consumptionHistory.map(rec => (
                            <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{rec.id}</td>
                                <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{formatDateTime(rec.date)}</td>
                                <td className="p-4"><span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md text-xs font-bold">{rec.workOrderId}</span></td>
                                <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{rec.technicianName}</td>
                                <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-slate-200">${rec.totalCost.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
      )}

      {isReceptionModalOpen && <ReceptionModal onClose={() => setIsReceptionModalOpen(false)} onSubmit={(doc) => { addSupplyDocument(doc); addToast(`Recepción registrada.`, 'SUCCESS'); }} user={user} />}
      {isConsumptionModalOpen && <ConsumptionModal onClose={() => setIsConsumptionModalOpen(false)} onSubmit={(rec) => { addConsumption(rec); addToast(`Despacho registrado.`, 'SUCCESS'); }} user={user} />}
      {selectedItemForHistory && <ItemHistoryModal item={selectedItemForHistory} onClose={() => setSelectedItemIdForHistory(null)} />}
    </div>
  );
};

// --- MODALS ---
const ReceptionModal: React.FC<{ onClose: () => void; onSubmit: (doc: SupplyDocument) => void; user: any }> = ({ onClose, onSubmit, user }) => {
    const { inventory, supplyDocuments } = useApp();
    const [type, setType] = useState<SupplyDocType>('FACTURA');
    const [provider, setProvider] = useState(''); const [reference, setReference] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<SupplyItem[]>([]);
    const [selectedItemId, setSelectedItemId] = useState(''); const [currentQty, setCurrentQty] = useState<number>(1); const [currentPrice, setCurrentPrice] = useState<number>(0);

    const handleAddItem = () => {
        const invItem = inventory.find(i => i.id === selectedItemId);
        if (!invItem || currentQty <= 0) return;
        setItems([...items, { itemId: invItem.id, sku: invItem.sku, name: invItem.name, quantity: currentQty, unitPrice: currentPrice }]);
        setSelectedItemId(''); setCurrentQty(1); setCurrentPrice(0);
    };
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;
        const net = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        onSubmit({ id: `RCP-${new Date().getFullYear()}-${(supplyDocuments.length + 1001).toString().slice(-4)}`, type, provider, externalReference: reference, date: new Date(date).toISOString(), items, netAmount: net, tax: Math.round(net * 0.19), totalAmount: net + Math.round(net * 0.19), receivedBy: user?.name || 'Desc', timestamp: new Date().toISOString() });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Ingreso de Abastecimiento</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><Icons.X size={24}/></button>
                </div>
                <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div><label className="label-xs">Tipo</label><select className="input-std" value={type} onChange={(e) => setType(e.target.value as any)}><option value="FACTURA">Factura</option><option value="GUIA_DESPACHO">Guía</option></select></div>
                            <div className="md:col-span-2"><label className="label-xs">Proveedor</label><input required type="text" className="input-std" value={provider} onChange={(e) => setProvider(e.target.value)} /></div>
                            <div><label className="label-xs">N° Doc</label><input required type="text" className="input-std" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 flex gap-3 items-end">
                             <div className="flex-1"><label className="label-xs">Item</label><select className="input-std" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}><option value="">-- Seleccione --</option>{inventory.map(i => <option key={i.id} value={i.id}>{i.sku} - {i.name}</option>)}</select></div>
                             <div className="w-24"><label className="label-xs">Cant.</label><input type="number" className="input-std" value={currentQty} onChange={(e) => setCurrentQty(parseInt(e.target.value))} /></div>
                             <div className="w-32"><label className="label-xs">Precio</label><input type="number" className="input-std" value={currentPrice} onChange={(e) => setCurrentPrice(parseInt(e.target.value))} /></div>
                             <button type="button" onClick={handleAddItem} className="bg-blue-600 text-white p-2 rounded"><Icons.Plus size={20} /></button>
                        </div>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                             <table className="w-full text-sm text-slate-800 dark:text-slate-200">
                                 <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-xs"><tr><th className="p-3">SKU</th><th className="p-3">Desc</th><th className="p-3 text-right">Cant</th><th className="p-3 text-right">Total</th><th className="w-10"></th></tr></thead>
                                 <tbody>{items.map((item, idx) => <tr key={idx} className="bg-white dark:bg-slate-900"><td className="p-3">{item.sku}</td><td className="p-3">{item.name}</td><td className="p-3 text-right">{item.quantity}</td><td className="p-3 text-right">${(item.quantity * item.unitPrice).toLocaleString()}</td><td className="p-3"><button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Icons.Trash size={16} className="text-red-500"/></button></td></tr>)}</tbody>
                             </table>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ConsumptionModal: React.FC<{ onClose: () => void; onSubmit: (rec: ConsumptionRecord) => void; user: any }> = ({ onClose, onSubmit, user }) => {
    const { inventory, workOrders, technicians, consumptionHistory } = useApp();
    const [selectedOtId, setSelectedOtId] = useState(''); const [selectedTechId, setSelectedTechId] = useState('');
    const [items, setItems] = useState<ConsumptionItem[]>([]); const [selectedItemId, setSelectedItemId] = useState(''); const [currentQty, setCurrentQty] = useState<number>(1);
    const activeOTs = workOrders.filter(ot => ot.status !== Status.FINISHED && ot.status !== Status.CANCELLED);
    const invItem = inventory.find(i => i.id === selectedItemId);

    const handleAddItem = () => {
        if (!invItem || currentQty <= 0) return;
        setItems([...items, { itemId: invItem.id, sku: invItem.sku, name: invItem.name, quantity: currentQty, unitPrice: invItem.price, total: currentQty * invItem.price }]);
        setSelectedItemId(''); setCurrentQty(1);
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0 || !selectedOtId || !selectedTechId) return;
        onSubmit({ id: `DSP-${new Date().getFullYear()}-${(consumptionHistory.length + 1001).toString().slice(-4)}`, workOrderId: selectedOtId, technicianId: selectedTechId, technicianName: technicians.find(t => t.id === selectedTechId)?.name || 'Desc', date: new Date().toISOString(), items, totalCost: items.reduce((a, b) => a + b.total, 0), dispatchedBy: user?.name || 'Sys', timestamp: new Date().toISOString() });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="bg-amber-50 dark:bg-amber-900/30 px-6 py-4 border-b border-amber-100 dark:border-amber-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200">Salida de Bodega</h3>
                    <button onClick={onClose}><Icons.X className="text-slate-400" size={24}/></button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                         <div className="grid grid-cols-2 gap-4">
                            <div><label className="label-xs">OT</label><select className="input-std" value={selectedOtId} onChange={e => setSelectedOtId(e.target.value)}><option value="">- OT -</option>{activeOTs.map(ot => <option key={ot.id} value={ot.id}>{ot.id} - {ot.title}</option>)}</select></div>
                            <div><label className="label-xs">Técnico</label><select className="input-std" value={selectedTechId} onChange={e => setSelectedTechId(e.target.value)}><option value="">- Tech -</option>{technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                         </div>
                         <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800 flex gap-3 items-end">
                             <div className="flex-1"><label className="label-xs">Item</label><select className="input-std" value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}><option value="">- Item -</option>{inventory.filter(i=>i.stock>0).map(i => <option key={i.id} value={i.id}>{i.sku} ({i.stock})</option>)}</select></div>
                             <div className="w-24"><label className="label-xs">Cant.</label><input type="number" max={invItem?.stock} className="input-std" value={currentQty} onChange={(e) => setCurrentQty(parseInt(e.target.value))} /></div>
                             <button type="button" onClick={handleAddItem} className="bg-amber-600 text-white p-2 rounded"><Icons.Plus size={20} /></button>
                         </div>
                         <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                             <table className="w-full text-sm text-slate-800 dark:text-slate-200">
                                 <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-xs"><tr><th className="p-3">Item</th><th className="p-3 text-right">Cant</th><th className="p-3 text-right">Total</th><th className="w-10"></th></tr></thead>
                                 <tbody>{items.map((item, idx) => <tr key={idx} className="bg-white dark:bg-slate-900"><td className="p-3">{item.name}</td><td className="p-3 text-right">{item.quantity}</td><td className="p-3 text-right">${item.total.toLocaleString()}</td><td className="p-3"><button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Icons.Trash size={16} className="text-red-500"/></button></td></tr>)}</tbody>
                             </table>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded font-bold">Cancelar</button>
                        <button type="submit" className="bg-amber-600 text-white px-6 py-2 rounded font-bold hover:bg-amber-700">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ItemHistoryModal: React.FC<{ item: InventoryItem; onClose: () => void }> = ({ item, onClose }) => {
    const { supplyDocuments, consumptionHistory } = useApp();
    const history = useMemo(() => {
        const txns: any[] = [];
        supplyDocuments.forEach(d => d.items.forEach(i => i.itemId === item.id && txns.push({ date: d.date, type: 'ENTRY', ref: d.externalReference, entity: d.provider, qty: i.quantity })));
        consumptionHistory.forEach(c => c.items.forEach(i => i.itemId === item.id && txns.push({ date: c.date, type: 'EXIT', ref: c.workOrderId, entity: c.technicianName, qty: i.quantity })));
        return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [item, supplyDocuments, consumptionHistory]);

    return (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div><h3 className="text-lg font-bold text-slate-800 dark:text-white">Kardex: {item.sku}</h3><p className="text-xs text-slate-500">{item.name}</p></div>
                    <button onClick={onClose}><Icons.X className="text-slate-400" size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {history.map((h, i) => (
                        <div key={i} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${h.type === 'ENTRY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>{h.type === 'ENTRY' ? 'Entrada' : 'Salida'}</span>
                                <p className="font-bold text-slate-800 dark:text-white text-sm mt-1">{h.entity}</p>
                                <p className="text-xs text-slate-500">Ref: {h.ref}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">{formatDateTime(h.date)}</p>
                                <p className={`text-lg font-bold font-mono ${h.type === 'ENTRY' ? 'text-green-600' : 'text-amber-600'}`}>{h.type === 'ENTRY' ? '+' : '-'}{h.qty}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};