'use client'
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { empresas, periodosNomina, trabajadores, vacaciones, recibosPago, tasas } from "@/db/schema";
import { generarLibroSueldos, generarLibroVacaciones, cerrarMes, generarAsientoContable } from "@/lib/reportes";
import { eq } from 'drizzle-orm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ReciboProcesado } from "@/lib/nomina";

// Dummy data for demonstration
const empresaId = '1';
const periodoId = '1';

async function getReportData() {
  const empresa = await db.select().from(empresas).where(eq(empresas.id, empresaId)).then(res => res[0]);
  const periodo = await db.select().from(periodosNomina).where(eq(periodosNomina.id, periodoId)).then(res => res[0]);
  const recibosData = await db.select().from(recibosPago).where(eq(recibosPago.periodoId, periodoId)) as ReciboProcesado[];
  const trabajadoresData = await db.select().from(trabajadores).where(eq(trabajadores.empresaId, empresaId));
  const tasa = await db.select().from(tasas).then(res => res[0]);

  const trabajadoresConVacaciones = await Promise.all(
    trabajadoresData.map(async (t) => {
      const vacacionData = await db.select().from(vacaciones).where(eq(vacaciones.trabajadorId, t.id));
      return { ...t, vacaciones: vacacionData };
    })
  );

  const recibosConTrabajadores = recibosData.map(r => ({
    ...r,
    trabajador: trabajadoresData.find(t => t.id === r.trabajadorId)!
  }));

  return { empresa, periodo, recibos: recibosConTrabajadores, trabajadores: trabajadoresConVacaciones, tasa };
}

async function handleCerrarMes() {
  'use server'
  await cerrarMes(periodoId);
  console.log('Mes cerrado');
}

export default async function ReportesPage() {
  const { empresa, periodo, recibos, trabajadores, tasa } = await getReportData();

  const libroSueldosHtml = generarLibroSueldos({ recibos, empresa, periodo });
  const libroVacacionesHtml = generarLibroVacaciones(trabajadores);
  const asientoContableHtml = generarAsientoContable({ recibos, empresa, periodo, tasa });

  const exportToPdf = (reportType: 'sueldos' | 'vacaciones') => {
    const doc = new jsPDF();
    const tableId = reportType === 'sueldos' ? 'sueldos-table' : 'vacaciones-table';
    
    doc.text(`${empresa.razonSocial} (RIF: ${empresa.rif})`, 14, 15);
    doc.text(`Reporte: ${reportType === 'sueldos' ? 'Libro de Sueldos' : 'Libro de Vacaciones'}`, 14, 25);
    doc.text(`Periodo: ${periodo.mes}/${periodo.anio}`, 14, 35);

    autoTable(doc, { html: `#${tableId}` });
    doc.save(`${reportType}.pdf`);
  };

  const exportToExcel = (reportType: 'sueldos' | 'vacaciones') => {
    const tableId = reportType === 'sueldos' ? 'sueldos-table' : 'vacaciones-table';
    const table = document.getElementById(tableId);
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, `${reportType}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Reportes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Libro de Sueldos y Salarios</span>
            <div className="space-x-2">
              <Button onClick={() => exportToPdf('sueldos')}>PDF</Button>
              <Button onClick={() => exportToExcel('sueldos')}>Excel</Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Libro de Vacaciones</span>
            <div className="space-x-2">
              <Button onClick={() => exportToPdf('vacaciones')}>PDF</Button>
              <Button onClick={() => exportToExcel('vacaciones')}>Excel</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Asiento Contable</CardTitle>
        </CardHeader>
        <CardContent>
          <div dangerouslySetInnerHTML={{ __html: asientoContableHtml }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cierre de Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCerrarMes}>
            <Button type="submit" disabled={periodo.status === 'cerrado'}>
              {periodo.status === 'cerrado' ? 'Mes Cerrado' : 'Cerrar Mes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Hidden tables for data export */}
      <div style={{ display: 'none' }}>
        <div dangerouslySetInnerHTML={{ __html: libroSueldosHtml.replace('<body>', '<body id="sueldos-table'>') }} />
        <div dangerouslySetInnerHTML={{ __html: libroVacacionesHtml.replace('<body>', '<body id="vacaciones-table'>') }} />
      </div>
    </div>
  );
}
