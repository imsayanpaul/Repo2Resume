import React from 'react';

export default function Footer({ onOpenSettings, onOpenJdModal }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span>Repo2Resume · open source, MIT</span>
        <span className="footer-spacer" />
        <button type="button" onClick={onOpenJdModal}>Job description matcher</button>
        <button type="button" onClick={onOpenSettings}>Settings</button>
        <a href="https://github.com/imsayanpaul/Repo2Resume" target="_blank" rel="noreferrer">Source</a>
        <a href="https://github.com/imsayanpaul" target="_blank" rel="noreferrer">Made by @imsayanpaul</a>
      </div>
    </footer>
  );
}
