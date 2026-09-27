import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  X,
  Upload,
  Trash2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { UploadedDocument } from '../types';

interface DocumentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: UploadedDocument[];
  onUploadFile: (file: File) => void;
  onRemoveDocument: (docId: string) => void;
  onLoadSampleDoc: () => void;
  selectedChunkNum?: number | null;
}

export const DocumentsDrawer: React.FC<DocumentsDrawerProps> = ({
  isOpen,
  onClose,
  documents,
  onUploadFile,
  onRemoveDocument,
  onLoadSampleDoc,
  selectedChunkNum,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white border-l border-teal-100 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-teal-100/80 flex items-center justify-between bg-white/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Document RAG & Chunk Memory</h2>
              <p className="text-[11px] text-teal-800/80">
                Auto-chunked (max 500 words/chunk) with semantic citations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-teal-800 hover:bg-teal-50 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-teal-200/90 hover:border-teal-500 rounded-3xl p-6 text-center bg-teal-50/20 hover:bg-teal-50/40 transition-all"
          >
            <input
              type="file"
              id="drawer-file-upload"
              onChange={(e) => {
                if (e.target.files?.[0]) onUploadFile(e.target.files[0]);
              }}
              accept=".pdf,.xlsx,.xls,.csv,.eml,.txt,.md"
              className="hidden"
            />
            <label
              htmlFor="drawer-file-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-white border border-teal-200 shadow-sm flex items-center justify-center text-teal-600">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                Click or drag & drop files to ingest
              </div>
              <div className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                Supports PDF, Excel (.xlsx/.csv), Email (.eml), TXT, Markdown (Max 50MB)
              </div>
            </label>
          </div>

          {/* Sample Q3 Report Banner if no docs */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 flex items-center justify-between gap-3 shadow-xs">
            <div className="text-xs text-teal-950">
              <span className="font-bold block text-teal-900">Benchmark Document Available</span>
              Load the benchmark <strong>Q3 Report.pdf</strong> with marketing and revenue figures.
            </div>
            <button
              onClick={onLoadSampleDoc}
              className="px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs shrink-0 cursor-pointer shadow-md shadow-teal-500/25 transition-all flex items-center gap-1"
            >
              <span>Load Q3 Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Documents List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Active Documents ({documents.length})</span>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 bg-white rounded-2xl border border-teal-100 p-4">
                No documents uploaded yet. Upload a document or load the sample Q3 report to enable RAG.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const isSelected = (currentDoc && currentDoc.id === doc.id);

                  return (
                    <div
                      key={doc.id}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                        isSelected
                          ? 'bg-teal-50/70 border-teal-400 ring-2 ring-teal-400/20'
                          : 'bg-white border-teal-100 hover:bg-teal-50/30'
                      }`}
                      onClick={() => setSelectedDocId(doc.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {doc.type === 'EXCEL' ? (
                            <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <FileText className="w-5 h-5 text-teal-600 shrink-0" />
                          )}
                          <div>
                            <div className="text-xs font-bold text-slate-800 line-clamp-1">
                              {doc.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="uppercase text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                                {doc.type}
                              </span>
                              <span>•</span>
                              <span>{doc.chunks.length} chunks</span>
                              <span>•</span>
                              <span>{(doc.size / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveDocument(doc.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Remove document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chunks Inspector for Selected Document */}
          {currentDoc && (
            <div className="space-y-3 pt-3 border-t border-teal-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Chunks Inspector: <span className="text-teal-700">{currentDoc.name}</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {currentDoc.chunks.length} chunks indexed
                </span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {currentDoc.chunks.map((chk) => {
                  const isHighlighted = selectedChunkNum === chk.chunkNumber;

                  return (
                    <div
                      key={chk.id}
                      className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all shadow-xs ${
                        isHighlighted
                          ? 'bg-teal-50 border-teal-500 text-teal-950 ring-2 ring-teal-500/20'
                          : 'bg-white border-teal-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-teal-900 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-teal-100 text-[10px] text-teal-800 border border-teal-200 font-bold">
                            Chunk {chk.chunkNumber}
                          </span>
                          <span className="line-clamp-1">{chk.title}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {chk.wordCount} words
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                        {chk.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
