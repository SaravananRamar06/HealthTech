export function WorkflowStrip({ current }: { current: 'import' | 'share' }) {
  return (
    <div className="workflow-strip" aria-label="Handover workflow">
      <span className={current === 'import' ? 'current' : ''}><b>1</b> Import documents</span>
      <span><b>2</b> Review every fact</span>
      <span className={current === 'share' ? 'current' : ''}><b>3</b> Share your brief</span>
    </div>
  );
}
