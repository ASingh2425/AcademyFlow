import Editor from '@monaco-editor/react'
import { useState } from 'react'
import { Loader2, Play, CheckCircle2, XCircle } from 'lucide-react'

interface TestCase {
  input: string
  expectedOutput: string
  isHidden: boolean
}

interface CodeEditorProps {
  code: string
  language: string
  onChange: (value: string | undefined) => void
  testCases: TestCase[]
}

export function CodeEditor({ code, language, onChange, testCases }: CodeEditorProps) {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<{ passed: boolean; output: string }[] | null>(null)

  const publicTestCases = testCases.filter((tc) => !tc.isHidden)

  const handleRunCode = async () => {
    setRunning(true)
    const newResults = []
    
    for (const tc of publicTestCases) {
      try {
        const res = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language,
            version: '*',
            files: [{ content: code }],
            stdin: tc.input,
          }),
        })
        const out = await res.json()
        const output = (out.run?.stdout || out.run?.output || '').trim()
        const passed = output === tc.expectedOutput.trim()
        newResults.push({ passed, output: output || '<no output>' })
      } catch (err) {
        newResults.push({ passed: false, output: 'Execution failed or timed out.' })
      }
    }
    
    setResults(newResults)
    setRunning(false)
  }

  return (
    <div className="flex flex-col h-[600px] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
      <div className="flex-1 min-h-[300px]">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={onChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
          }}
          loading={
            <div className="flex h-full items-center justify-center bg-slate-900">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          }
        />
      </div>

      {publicTestCases.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 max-h-[250px] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Sample Test Cases
            </h4>
            <button
              onClick={handleRunCode}
              disabled={running}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {running ? 'Running...' : 'Run Code'}
            </button>
          </div>

          <div className="space-y-3">
            {publicTestCases.map((tc, i) => (
              <div key={i} className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Case {i + 1}</span>
                  {results && results[i] && (
                    results[i].passed ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                        <XCircle className="h-3.5 w-3.5" /> Failed
                      </span>
                    )
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase mb-1">Input</p>
                    <pre className="bg-slate-50 dark:bg-slate-800 p-2 rounded overflow-x-auto text-slate-700 dark:text-slate-300">
                      {tc.input}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase mb-1">Expected</p>
                    <pre className="bg-slate-50 dark:bg-slate-800 p-2 rounded overflow-x-auto text-slate-700 dark:text-slate-300">
                      {tc.expectedOutput}
                    </pre>
                  </div>
                </div>
                {results && results[i] && !results[i].passed && (
                  <div className="mt-2 text-xs font-mono">
                    <p className="text-[10px] text-red-400 uppercase mb-1">Actual Output</p>
                    <pre className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 p-2 rounded overflow-x-auto text-red-700 dark:text-red-400">
                      {results[i].output}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
