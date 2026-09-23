import jsPDF from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";
import {
  colorHex,
  DAY_NAMES,
  formatTimeShort,
  toMinutes,
  type Timetable,
} from "./timetable-service";

/**
 * Converts a hex color string to RGB array for jsPDF.
 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length !== 6) return [240, 240, 240];
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/**
 * Generates and downloads a PDF of the timetable.
 */
export async function generateTimetablePDF(timetable: Timetable): Promise<void> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const { settings } = timetable;
  const days = [...settings.workingDays].sort((a, b) => a - b);

  // 1. Header (Trace Branding)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("TRACE", 14, 20);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  const statusLabel = timetable.status === "published" ? "Published" : "Draft";
  doc.text(`CLASS TIMETABLE - ${statusLabel}`, 14, 28);

  // 2. Metadata Subtitles
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${timetable.department} • ${timetable.year} • Division ${timetable.division} • Semester ${timetable.semester}`, 14, 34);
  doc.text(`Academic Year ${timetable.academicYear}`, 14, 39);

  // Reset text color for table
  doc.setTextColor(0, 0, 0);

  // 3. Prepare Table Data
  const head = [["Time", ...days.map((d) => DAY_NAMES[d])]];
  const body: any[][] = [];
  const timeStructure = settings.timeStructure || [];

  if (timeStructure.length === 0) {
    body.push([{ content: "No lectures scheduled", colSpan: days.length + 1, styles: { halign: "center", fontStyle: "italic", textColor: [150, 150, 150] } }]);
  }

  for (let i = 0; i < timeStructure.length; i++) {
    const block = timeStructure[i];
    const timeLabel = `${formatTimeShort(block.startTime)} - ${formatTimeShort(block.endTime)}`;
    const rowData: any[] = [timeLabel];

    if (block.type === "break") {
      rowData.push({
        content: block.name || "Break",
        colSpan: days.length,
        styles: {
          halign: "center",
          valign: "middle",
          fillColor: [245, 245, 245],
          textColor: [100, 100, 100],
          fontStyle: "italic",
        },
      });
    } else {
      for (const d of days) {
        const lec = timetable.lectures.find(
          (l) => l.dayOfWeek === d && toMinutes(l.startTime) === toMinutes(block.startTime)
        );

        if (lec) {
          const bgHex = colorHex(
            timetable.subjects.find((s) => s.id === lec.subjectId)?.color || "blue"
          );
          
          let content = lec.subjectName;
          if (lec.teacherName) content += `\n${lec.teacherName}`;
          if (lec.room) content += `\n${lec.room}`;

          rowData.push({
            content,
            styles: {
              fillColor: hexToRgb(bgHex),
              textColor: [255, 255, 255],
              halign: "center",
              valign: "middle",
              fontStyle: "bold",
              cellPadding: 3,
            },
          });
        } else {
          rowData.push(""); // Empty cell
        }
      }
    }
    body.push(rowData);
  }

  // Calculate proportional row height.
  // We have ~130mm available for the table body.
  // Let's assume a 60 min lecture takes 18mm height.
  const BASE_HEIGHT_PER_HOUR = 18;

  autoTable(doc, {
    startY: 45,
    head,
    body,
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [50, 50, 50],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 35, halign: "center", valign: "middle", fontStyle: "bold", textColor: [100, 100, 100] },
    },
    styles: {
      fontSize: 9,
      overflow: "linebreak",
    },
    margin: { top: 15, bottom: 20, left: 14, right: 14 },
    didParseCell: (data: CellHookData) => {
      // Set custom height based on actual time duration
      if (data.section === "body" && data.row.index >= 0) {
        const block = (settings.timeStructure || [])[data.row.index];
        if (block) {
          const durationMins = toMinutes(block.endTime) - toMinutes(block.startTime);
          const customHeight = (durationMins / 60) * BASE_HEIGHT_PER_HOUR;
          data.cell.styles.minCellHeight = customHeight;
        }
      }
    },
  });

  // 4. Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated from Trace • Class Timetable • Academic Year ${timetable.academicYear}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // 5. Download
  const filename = [
    "Trace",
    "Timetable",
    timetable.department,
    timetable.year,
    `Div_${timetable.division}`,
    `Sem_${timetable.semester}`,
  ]
    .map((s) => s.replace(/[^a-zA-Z0-9]+/g, "_"))
    .join("_") + ".pdf";

  doc.save(filename);
}
