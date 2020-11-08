import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import 'antd/es/tree/style/css';
import Tree from 'antd/es/tree';

import 'antd/es/icon/style/css';
import Icon from 'antd/es/icon';

import 'antd/es/spin/style/css';
import Spin from 'antd/es/spin';

import 'antd/es/input/style/css';
import Input from 'antd/es/input';

import 'antd/es/select/style/css';
import Select from 'antd/es/select';

import { truncate } from 'lodash';

import cp from 'chrome-promise';

import { MODES } from './blacklist';

function renderTree(tree) {
  return tree
    .filter((i) => i)
    .map((node) => {
      if (node.children) {
        if (!node.title && !node.url) {
          return renderTree(node.children);
        }

        return (
          <Tree.TreeNode
            title={truncate(node.title, { length: 60 })}
            key={node.id}
            icon={<Icon type="folder" />}
          >
            {renderTree(node.children)}
          </Tree.TreeNode>
        );
      }

      let icon = <Icon type="file" />;

      if (node.url) {
        icon = <img src={`chrome://favicon/size/16@1x/${node.url}`} alt="Favicon" />;
      }

      return (
        <Tree.TreeNode
          selectable={false}
          title={<a href={node.url}>{truncate(node.title, { length: 60 })}</a>}
          key={node.id}
          icon={icon}
        />
      );
    });
}

const Application = () => {
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [blacklist, setBlacklist] = useState('');
  const [blacklistMode, setBlacklistMode] = useState(MODES.DISABLED);
  const [tree, setTree] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      cp.bookmarks.getTree(),
      cp.storage.local.get({ bookmarks: [], blacklist: '', blacklistMode: MODES.DISABLED }),
    ])
      .then(([tree, { bookmarks, blacklist, blacklistMode }]) => {
        setBlacklist(blacklist);
        setBlacklistMode(blacklistMode);
        setSelected(bookmarks);
        setTree(tree);
      })
      .then(() => {
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  async function saveBlacklist(event) {
    const blacklist = String(event.target.value);
    try {
      await cp.storage.local.set({
        blacklist,
      });
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1em' }}>
      {loading && (
        <div
          style={{
            height: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" />
        </div>
      )}
      {!loading && (
        <>
          <h1>Random Bookmark Options:</h1>
          <p>
            This extension will redirect to one of the selected bookmarks when you open a new tab.
          </p>
          <h4>Active bookmarks</h4>
          <Tree
            checkable
            selectable={false}
            defaultCheckedKeys={selected}
            onCheck={async (selected) => {
              try {
                await cp.storage.local.set({
                  bookmarks: selected,
                });
              } catch (error) {
                console.error(error);
              }
            }}
            showIcon
          >
            {renderTree(tree)}
          </Tree>

          <h4 style={{ marginTop: '1em' }}>
            Blacklist
            <Select
              value={blacklistMode}
              style={{ width: 180, marginLeft: '1em' }}
              onChange={async (value) => {
                console.log('On change', value);
                try {
                  setBlacklistMode(value);
                  await cp.storage.local.set({
                    blacklistMode: value,
                  });
                } catch (error) {
                  console.error(error);
                }
              }}
            >
              <Select.Option value={MODES.DISABLED}>Disabled</Select.Option>
              <Select.Option value={MODES.ALL}>Block all</Select.Option>
              <Select.Option value={MODES.ADDRESS_BAR}>Block address bar</Select.Option>
            </Select>
          </h4>
          <Input.TextArea
            placeholder={`Each line will be compiled as regular expression, eg:\nreddit\\.com\n`}
            disabled={blacklistMode === MODES.DISABLED}
            rows={6}
            defaultValue={blacklist}
            onBlur={saveBlacklist}
            onPressEnter={saveBlacklist}
          />
        </>
      )}
    </div>
  );
};

const MOUNT_NODE = document.getElementById('root');
ReactDOM.render(<Application />, MOUNT_NODE);
