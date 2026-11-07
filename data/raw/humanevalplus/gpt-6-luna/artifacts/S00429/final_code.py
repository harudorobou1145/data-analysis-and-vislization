
def Strongest_Extension(class_name, extensions):
    """Return the extension with the greatest uppercase-minus-lowercase score.

    Ties are resolved in favor of the extension appearing first in the list.
    The result is formatted as ``ClassName.ExtensionName``.
    """
    strongest = None
    strongest_score = None

    for extension in extensions:
        score = sum(1 for char in extension if char.isupper()) - sum(
            1 for char in extension if char.islower()
        )
        if strongest is None or score > strongest_score:
            strongest = extension
            strongest_score = score

    if strongest is None:
        raise ValueError("extensions must contain at least one item")

    return f"{class_name}.{strongest}"
