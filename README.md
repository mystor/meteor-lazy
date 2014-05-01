# meteor-lazy [![Build Status](https://travis-ci.org/mystor/meteor-lazy.svg?branch=master)](https://travis-ci.org/mystor/meteor-lazy)

> Lazily load any file type

Meteor-lazy is a package for [Meteor](http://meteor.com) which enables developers to lazily load any filetype.

## Usage
### Basic usage
Using meteor-lazy is very simple. To make a file lazy, simply add `.lazy` immediately before its extension (for example `.coffee`). This works for _any_ extension which a plugin used by your app supports.

```
filename.js     => filename.lazy.js
filename.coffee => filename.lazy.coffee
filename.css    => filename.lazy.css
filename.less   => filename.lazy.less
filename.html   => filename.lazy.html
```

Then, once you have done this, you can load these files at any time by calling `Lazy.require` or `Lazy.load`.

`Lazy.require` will only load the file once. Any future calls to `Lazy.require` will not load the file again.
```
// Will only load filename.lazy.js once
Lazy.require('path/to/filename.lazy.js');
Lazy.require('path/to/filename.lazy.js');
```

While `Lazy.load` will always load the file.
```
// Will load filename.lazy.js twice, evaluating it twice
Lazy.load('path/to/filename.lazy.js');
Lazy.load('path/to/filename.lazy.js');
```

`Lazy.load` and `Lazy.require` work on both the client and the server.

### Compilation Options
You can adjust the compilation of the files through the use of YAML frontmatter on your `.lazy.*` files. The following are the possible options:

`name`: An alternate name to load the file by.  This can be passed instead of the path to `Lazy.load/require`. The original path is still usable.

`minify`: Whether or not to minify the file. It is currently possible to determine whether Meteor intends to minify any produced assets, so it is not possible to easily do this programmatically. I am looking into other options (such as an environment variable) which could be set to toggle this globally.

Example:
```
---
  name: 'alternate-name' # This file can be loaded by Lazy.load/require('alternate-name');
  minify: true # 
---

// Your code goes here
```

## Technical-ish information
### Evaluation location
CSS, when it is lazy loaded, is appended to the head in a `link` tag.

JS, when it is lazy loaded, is evaluated within the same environment where it would be placed normally.  This means that, on the server, you have access to the `Npm` and `Assets` objects, and in packages, you have access to package-scoped variables.

Unfortunately, Bare files are not currently supported for lazy loading, the bare property will be ignored. I will probably add this as a feature at some point (shouldn't be too difficult).

### Source Maps
When source maps are provided by a compiler, and the `minify` option is not set, they will be served to the client. The source shown in the inspector will not contain the YAML frontmatter.  I currently generate a source map while I strip the frontmatter, but I am not experienced enough with source maps to merge them.

Any pull request fixing this issue would be appreciated.

## Caveats
- If `lazy` is not the last entry in the `.meteor/packages` file, fresh clones of your app will not correctly detect extensions. This means that files which would otherwise be lazy will instead by non-lazy. However, if the app is not fresh, it should correctly detect all of them.
- The extension detection used by `lazy` depends on a lot of undocumented Meteor APIs. There is a _chance_ that it will break in future versions of Meteor.
- `lazy` doesn't follow the same extension scoping rules as Meteor. If an extension is used anywhere in your application (including only in extensions) it will be avaliable anywhere which uses `lazy`.


