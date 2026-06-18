Centered modal — scrim with light blur, rise-in animation, optional header and footer. The Compose and Reply flows build on this.

```jsx
<Dialog title="Compose with AI" subtitle="Describe the email and pick a tone."
  onClose={close}
  footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button>Send</Button></>}>
  …form…
</Dialog>
```

Click-scrim and the close button both call `onClose`.
