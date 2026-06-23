import Editor, { loader } from '@monaco-editor/react'
import { useState, useEffect } from 'react'
import { Loader2, Play, CheckCircle2, XCircle } from 'lucide-react'

// Configure Monaco Loader to use jsdelivr CDN
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs'
  }
})

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
  const [loadFailed, setLoadFailed] = useState(false)
  const [useFallback, setUseFallback] = useState(false)

  const publicTestCases = testCases.filter((tc) => !tc.isHidden)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadFailed(true)
    }, 7000)
    return () => clearTimeout(timer)
  }, [])

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
      <div className="flex-1 min-h-[300px] relative">
        {useFallback ? (
          <textarea
            className="w-full h-full p-4 font-mono text-sm bg-slate-950 text-slate-100 border-none outline-none resize-none focus:ring-0"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your solution code here..."
          />
        ) : (
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={onChange}
            onMount={() => setLoadFailed(false)}
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
        )}

        {loadFailed && !useFallback && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
            <p className="text-sm font-semibold text-slate-200">Editor is taking longer than expected to load</p>
            <p className="text-xs text-slate-400 mt-1">This might be due to a slow internet connection or blocked CDN.</p>
            <button
              type="button"
              onClick={() => setUseFallback(true)}
              className="mt-4 rounded-lg bg-indigo-500 hover:bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors"
            >
              Switch to Plain Text Editor
            </button>
          </div>
        )}
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
