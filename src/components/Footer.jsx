import React from 'react';

export default function Footer({ onOpenSettings }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-links">
          <button type="button" onClick={onOpenSettings}>Settings</button>
          <a href="https://github.com/imsayanpaul/Repo2Resume" target="_blank" rel="noreferrer">Source</a>
          <a href="https://github.com/imsayanpaul/Repo2Resume/issues" target="_blank" rel="noreferrer">Report a bug</a>
        </span>
        <a className="footer-license" href="https://github.com/imsayanpaul/Repo2Resume/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT license</a>
      </div>
    </footer>
  );
}
