/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const defaultContent = `
# Hello world

Try out [links](https://tiptap.dev) and some **bold** or _italic_ text.

~~~
console.log('atest');
~~~

And more!

~~~html
<div style="color: red;" onclick="foo()">This is a red div</div>

<script>
  function foo() {
    document.querySelector('div').innerHTML = 'Hello!';
  };
</script>
~~~

Oh and mentions are supported too: Special thanks to <span data-type="mention" data-id="Lea Thompson"></span>!
`;