def will_it_fly(q, w):
    '''
    Return True if q is a palindromic list whose elements sum to at most w.

    The object flies only when it is balanced (the list reads the same
    forwards and backwards) and its total weight does not exceed w.
    '''
    return q == q[::-1] and sum(q) <= w
