"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  X,
  Check,
  AlertCircle,
  Loader2,
  Download,
  Eye,
} from "lucide-react";

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
}

interface ExcelImportProps {
  onSuccess?: () => void;
}

export default function ExcelImport({ onSuccess }: ExcelImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setError(null);

    // Preview first 5 rows
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const XLSX = require("xlsx");
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        setPreview(jsonData.slice(0, 5));
      } catch (err) {
        setError("Không thể đọc file Excel");
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }

  async function handleImport() {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/requests/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data.results);
        if (data.results.failed === 0) {
          setTimeout(() => {
            setIsOpen(false);
            setFile(null);
            setPreview([]);
            onSuccess?.();
          }, 2000);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Đã có lỗi xảy ra khi import");
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadTemplate() {
    const XLSX = require("xlsx");
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // ============ SHEET 1: HƯỚNG DẪN ============
    const guideData = [
      ["HƯỚNG DẪN IMPORT YÊU CẦU"],
      [""],
      ["Bước 1: Điền thông tin vào sheet \"Dữ liệu\""],
      ["Bước 2: Lưu file Excel"],
      ["Bước 3: Chọn file và nhấn Import"],
      [""],
      ["QUAN TRỌNG:"],
      ["• Cột \"Tiêu đề\" là bắt buộc"],
      ["• Mức độ ưu tiên: Thấp / Trung bình / Cao / Gấp"],
      ["• Định dạng ngày: YYYY-MM-DD (VD: 2026-12-31)"],
      [""],
      ["CỘT DỮ LIỆU:"],
      ["A. Tiêu đề (bắt buộc) - Tiêu đề yêu cầu"],
      ["B. Đơn vị - Đơn vị đề xuất"],
      ["C. Link/Site - Đường dẫn trang web"],
      ["D. Link chức năng - Đường dẫn chức năng"],
      ["E. Hiện trạng - Tình trạng hiện tại"],
      ["F. Nội dung cần điều chỉnh - Mô tả chi tiết"],
      ["G. Quy trình thao tác - Các bước thực hiện"],
      ["H. Mức độ ưu tiên - Thấp/Trung bình/Cao/Gấp"],
      ["I. Hạn chót - Ngày cần hoàn thành"],
    ];
    const guideSheet = XLSX.utils.aoa_to_sheet(guideData);
    guideSheet["!cols"] = [{ wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, guideSheet, "Hướng dẫn");
    
    // ============ SHEET 2: DỮ LIỆU ============
    // Headers with Vietnamese
    const headers = [
      ["Tiêu đề", "Đơn vị", "Link/Site", "Link chức năng", "Hiện trạng", "Nội dung cần điều chỉnh", "Quy trình thao tác", "Mức độ ưu tiên", "Hạn chót"]
    ];
    
    // Sample data
    const sampleData = [
      ["Điều chỉnh form đăng nhập", "Phòng IT", "https://crm.example.com", "https://crm.example.com/login", "Đang hoạt động", "Cần thêm trường mã nhân viên", "Bước 1: Truy cập hệ thống\nBước 2: Vào Cài đặt\nBước 3: Chỉnh sửa form", "Cao", "2026-12-31"],
      ["Nâng cấp hệ thống 2FA", "Phòng IT", "https://auth.example.com", "https://auth.example.com/2fa", "Cần nâng cấp", "Bổ sung xác thực 2 lớp", "Bước 1: Đăng nhập admin\nBước 2: Vào Bảo mật\nBước 3: Bật 2FA", "Gấp", "2026-12-15"],
      ["Cập nhật quy trình phê duyệt", "Phòng Kinh doanh", "https://sales.example.com", "https://sales.example.com/approval", "Đang hoạt động", "Thay đổi luồng phê duyệt đơn hàng", "Bước 1: Vào quản trị\nBước 2: Chọn Quy trình\nBước 3: Chỉnh sửa", "Trung bình", "2026-12-20"],
    ];
    
    const sheetData = [...headers, ...sampleData];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    worksheet["!cols"] = [
      { wch: 30 },  // Tiêu đề
      { wch: 18 },  // Đơn vị
      { wch: 25 },  // Link/Site
      { wch: 30 },  // Link chức năng
      { wch: 15 },  // Hiện trạng
      { wch: 35 },  // Nội dung cần điều chỉnh
      { wch: 40 },  // Quy trình thao tác
      { wch: 15 },  // Mức độ ưu tiên
      { wch: 12 },  // Hạn chót
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ liệu");
    
    // ============ SHEET 3: MẪU ƯU TIÊN ============
    const priorityData = [
      ["MỨC ĐỘ ƯU TIÊN"],
      [""],
      ["Thấp"],
      ["Trung bình"],
      ["Cao"],
      ["Gấp"],
    ];
    const prioritySheet = XLSX.utils.aoa_to_sheet(priorityData);
    prioritySheet["!cols"] = [{ wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, prioritySheet, "Mẫu ưu tiên");
    
    // Set active sheet to Dữ liệu
    workbook.SheetNames = ["Hướng dẫn", "Dữ liệu", "Mẫu ưu tiên"];
    
    XLSX.writeFile(workbook, "Mau_Import_YeuCau.xlsx");
  }

  function reset() {
    setFile(null);
    setPreview([]);
    setResult(null);
    setError(null);
  }

  return (
    <>
      {/* Import Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="btn-secondary flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Import từ Excel
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-vnpt-darkblue">
                  Import yêu cầu từ Excel
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  reset();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Download Template */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">
                      📥 Tải file mẫu
                    </p>
                    <p className="text-sm text-blue-700">
                      Download file Excel mẫu với các cột dữ liệu đúng định dạng
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Tải file mẫu
                  </button>
                </div>
              </div>

              {/* File Upload */}
              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-vnpt-blue hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">
                    Click để chọn file Excel
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Hỗ trợ file .xlsx, .xls, .csv
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected File */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={reset}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Preview Table */}
                  {preview.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Xem trước (5 dòng đầu):
                        </span>
                      </div>
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(preview[0]).map((key) => (
                                <th
                                  key={key}
                                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                                >
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {preview.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                {Object.values(row).map((val, valIdx) => (
                                  <td
                                    key={valIdx}
                                    className="px-3 py-2 text-gray-700"
                                  >
                                    {String(val).substring(0, 50)}
                                    {String(val).length > 50 ? "..." : ""}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Chỉ hiển thị 5 dòng đầu. File sẽ import toàn bộ dữ liệu.
                      </p>
                    </div>
                  )}

                  {/* Column Mapping Info */}
                  <div className="p-3 bg-yellow-50 rounded-lg text-sm">
                    <p className="font-medium text-yellow-800 mb-2">
                      📋 Các cột dữ liệu:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-yellow-700">
                      <span>• tieuDe / Tiêu đề (bắt buộc)</span>
                      <span>• donVi / Đơn vị</span>
                      <span>• linkSite / Link/Site</span>
                      <span>• linkChucNang / Link chức năng</span>
                      <span>• hienTrang / Hiện trạng</span>
                      <span>• noiDungDieuChinh / Nội dung cần điều chỉnh</span>
                      <span>• quyTrinhThaoTac / Quy trình thao tác</span>
                      <span>• mucDoUuTri / Mức độ ưu tiên</span>
                      <span>• hanChot / Hạn chót (YYYY-MM-DD)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Result */}
              {result && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    result.failed === 0
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.failed === 0 ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                      {result.failed === 0
                        ? "Import thành công!"
                        : "Import hoàn tất với lỗi"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p>✅ Thành công: {result.success} yêu cầu</p>
                    {result.failed > 0 && (
                      <p>❌ Lỗi: {result.failed} yêu cầu</p>
                    )}
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-3 text-sm">
                      <p className="font-medium mb-1">Chi tiết lỗi:</p>
                      <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                        {result.errors.map((err, idx) => (
                          <li key={idx}>
                            Dòng {err.row}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  reset();
                }}
                className="btn-secondary"
              >
                Hủy
              </button>
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang import...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
