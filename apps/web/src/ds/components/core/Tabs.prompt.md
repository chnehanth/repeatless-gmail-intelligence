Underline tabs with an electric-blue active indicator and optional monospace counts.

```jsx
<Tabs tabs={[{value:'all',label:'All'},{value:'unread',label:'Unread',count:12}]} defaultValue="all" onChange={setView} />
```

Works controlled (`value`+`onChange`) or uncontrolled (`defaultValue`).
