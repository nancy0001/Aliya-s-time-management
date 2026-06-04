# Time Manager Data Storage

## Runtime data location (history data)

Time Manager historical data is stored in browser `localStorage`, not in source files.

### Required origin
- `http://localhost:5174/time-manager`

Use the same origin consistently.  
`localhost` and `127.0.0.1` are different storage spaces.

## localStorage keys

- Entries (history records): `aliya-time-manager-v1`
- Plans (goal/board settings): `aliya-time-manager-plan-v2`
- Legacy plan key (migration): `aliya-time-manager-plan-v1`

## Notes

- The folder `time-manager_bundle` contains code/script copies only.
- If browser cache/storage is cleared, local history can be lost unless exported/backed up.
