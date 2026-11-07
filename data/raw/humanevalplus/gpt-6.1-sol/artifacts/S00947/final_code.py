def is_nested(string):
    '''Return True when a matched bracket pair contains another matched pair.

    Unmatched brackets outside a nested group do not invalidate that group.
    '''
    # Each open bracket records whether a complete pair has closed inside it.
    contains_pair = []
    for bracket in string:
        if bracket == '[':
            contains_pair.append(False)
        elif bracket == ']' and contains_pair:
            if contains_pair.pop():
                return True
            if contains_pair:
                contains_pair[-1] = True
    return False
